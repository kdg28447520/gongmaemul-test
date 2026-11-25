#!/usr/bin/env python3
"""네이버 데이터랩 검색어트렌드로 fruit/season.json(제철 지수)을 다시 만든다.

실행:  python3 fruit/refresh_season.py            # 조회 후 season.json 덮어쓰기
       python3 fruit/refresh_season.py --dry-run  # 조회·계산만 하고 파일은 그대로

원리
- 데이터랩 검색어트렌드는 한 번에 주제어 5개까지 조회된다. 5개씩 묶어 일간 지수를 받는다.
- 묶음 안에서는 가장 많이 검색된 검색어의 최다일이 100으로 정규화되어 오므로,
  비율(월별 상대 변화)은 원자료와 같다. 그래서 각 품목을 자기 최다월=100으로 다시 나눠
  0~100 지수로 환산한다.
- 월 값은 그 달에 관측된 일별 지수의 '일평균'이다. 진행 중인 달(오늘까지 며칠치)도
  일평균이라 다른 달과 같은 자로 비교된다. 월 '합산'을 쓰면 이번 달이 반토막 나 보인다.
- 조회 창은 (오늘-1일)부터 1년 전 같은 날까지. 월 버킷 12개(이번 달 + 지난 11개월)를 쓴다.
  창 맨 앞의 반쪽 달은 버린다.
- 해시 발급(POST /qcHash.naver)은 날짜를 YYYYMMDD로 보내야 통과한다(YYYY-MM-DD는 INVALID_PARAMS).
- 일별 데이터는 익일 8~10시간 후 반영되므로 '어제'까지를 창 끝으로 둔다.

갱신 주기: 매주 월요일 1회면 충분하다(요청서 기준).
"""
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'season.json')
UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
DATALAB = 'https://datalab.naver.com'

# data.json 의 item_group 27개 — 표기를 똑같이 맞춘다(앱 매칭 기준).
GROUPS = ['사과', '감', '감귤', '배', '포도', '복숭아', '자두', '살구', '딸기', '수박',
          '참외', '멜론', '키위', '망고', '바나나', '오렌지', '레몬', '자몽', '라임',
          '블루베리', '체리', '석류', '대추', '곶감', '아보카도', '용과', '무화과']
# data.json 에 실제로 올라오는 주요 품종(가능하면 추가)
VARIETIES = ['부사', '감홍', '시나노골드', '샤인머스캣', '레드향', '황금향', '대봉감',
             '허니듀', '애플망고', '신고배', '설향딸기', '캠벨포도', '골드키위']
KEYWORDS = GROUPS + VARIETIES
# 이름만으로는 다른 뜻과 섞이는 품목은 과일 쪽 검색어로 좁힌다(합산 조회).
WORD_OVERRIDE = {
    '멜론': ['멜론 가격', '머스크메론', '메론'],   # '멜론'은 음악 서비스와 섞임
    '라임': ['라임 가격', '라임청'],               # '라임'은 'rhyme' 뜻과 섞임
}


def words_of(name):
    return WORD_OVERRIDE.get(name) or [name]
BATCH = 5           # 데이터랩 주제어 최대 5개
SLEEP = 1.5         # 연속 호출 예절


def _opener():
    op = urllib.request.build_opener()
    op.addheaders = [('User-Agent', UA), ('Accept-Language', 'ko-KR,ko;q=0.9')]
    return op


OP = _opener()


def hash_key(words, start, end):
    """words: [(표시이름, [검색어,...]), ...]"""
    """검색어 묶음의 hashKey를 발급받는다. start/end 는 datetime.date."""
    groups = '__OUML__'.join('%s__SZLIG__%s' % (n, ','.join(ws)) for n, ws in words)
    data = {'qcType': 'N', 'queryGroups': groups,
            'startDate': start.strftime('%Y%m%d'), 'endDate': end.strftime('%Y%m%d'),
            'timeUnit': 'date', 'gender': '', 'age': '', 'device': ''}
    req = urllib.request.Request(DATALAB + '/qcHash.naver',
                                 data=urllib.parse.urlencode(data).encode())
    req.add_header('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8')
    req.add_header('Referer', DATALAB + '/keyword/trendSearch.naver')
    req.add_header('X-Requested-With', 'XMLHttpRequest')
    with OP.open(req, timeout=60) as r:
        j = json.loads(r.read().decode())
    if not j.get('success'):
        raise RuntimeError('hashKey 발급 실패: %s' % j.get('message'))
    return j['hashKey']


def fetch_xlsx(hash_key_):
    req = urllib.request.Request(DATALAB + '/qcExcel.naver?hashKey=' + hash_key_)
    req.add_header('Referer', DATALAB + '/keyword/trendResult.naver')
    with OP.open(req, timeout=120) as r:
        return r.read()


def parse_xlsx(blob, path_for_openpyxl):
    """xlsx 바이트 → {검색어: {날짜: 지수}} 와 기간 설명."""
    import openpyxl
    with open(path_for_openpyxl, 'wb') as f:
        f.write(blob)
    wb = openpyxl.load_workbook(path_for_openpyxl)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    period = ''
    for r in rows:
        if r and r[0] == '기간' and len(r) > 1 and r[1]:
            period = str(r[1])
            break
    hi = next(i for i, r in enumerate(rows) if r and r[0] == '날짜')
    head = rows[hi]
    cols = [(j, head[j + 1]) for j in range(0, len(head) - 1, 2)
            if head[j] == '날짜' and head[j + 1]]
    out = {}
    for r in rows[hi + 1:]:
        if not r or not r[0]:
            continue
        for j, name in cols:
            d, v = r[j], r[j + 1]
            if d and v not in (None, ''):
                out.setdefault(name, {})[str(d)] = float(v)
    return out, period


def month_buckets(daily, start, end):
    """관측된 날짜 → 월별 일평균. 마지막 12개 월만, 창 맨 앞의 반쪽 달은 버린다."""
    acc = {}
    for d, v in daily.items():
        m = d[:7]
        a = acc.setdefault(m, [0.0, 0])
        a[0] += v
        a[1] += 1
    months = sorted(acc)
    # 이번 달(창 끝의 달) 포함 12개
    months = months[-12:]
    return {m: acc[m][0] / acc[m][1] for m in months}


def build_preempt(items, months):
    """다음 1~2개월의 제철 상승 배수를 미리 계산한다(철대표 제철 선점 체크).

    배수 = 창 안에서 같은 달의 지수(작년·올해) ÷ 이번 달 지수.
    월 버킷이 12개뿐이라 12월은 작년 12월, 1월은 올 1월 값이 잡힌다.
    앱이 없어도 이 값으로 바로 판단할 수 있게 season.json 에 함께 남긴다.
    """
    cur = months[-1]
    cur_m = int(cur[5:7])
    targets = []
    for step in (1, 2):
        m = (cur_m - 1 + step) % 12 + 1
        key = next((k for k in months if int(k[5:7]) == m), None)
        targets.append({'month': m, 'key': key})
    rows = []
    for it in items:
        now = it['monthly'].get(cur) or 0
        if not now:
            continue
        mult = []
        for t in targets:
            v = it['monthly'].get(t['key']) if t['key'] else None
            mult.append(round(v / now, 2) if v else None)
        rows.append({'name': it['name'], 'index': now, 'mult': mult})
    rows.sort(key=lambda r: max([x or 0 for x in r['mult']]), reverse=True)
    return {'base_month': cur, 'targets': targets, 'items': rows}


def build(dry_run=False):
    today = dt.date.today()
    end = today - dt.timedelta(days=1)          # 일별 데이터는 하루 늦게 반영
    start = end - dt.timedelta(days=364)        # 1년 창
    print('조회 창: %s ~ %s' % (start, end), flush=True)

    series, period = {}, ''
    tmp = os.path.join(HERE, '.season_tmp.xlsx')
    for i in range(0, len(KEYWORDS), BATCH):
        names = KEYWORDS[i:i + BATCH]
        words = [(n, words_of(n)) for n in names]
        hk = hash_key(words, start, end)
        blob = fetch_xlsx(hk)
        got, period = parse_xlsx(blob, tmp)
        for n in names:
            if n not in got:
                print('  ! 응답에 없음:', n, file=sys.stderr)
        series.update(got)
        print('  %2d/%d %s' % (min(i + BATCH, len(KEYWORDS)), len(KEYWORDS),
                               ', '.join(names)), flush=True)
        time.sleep(SLEEP)
    if os.path.exists(tmp):
        os.remove(tmp)

    items = []
    for name in KEYWORDS:
        daily = series.get(name)
        if not daily:
            continue
        monthly_raw = month_buckets(daily, start, end)
        if len(monthly_raw) < 12:
            continue
        peak = max(monthly_raw.values()) or 1.0
        months = sorted(monthly_raw)
        monthly = {m: round(monthly_raw[m] / peak * 100, 1) for m in months}
        this_m = months[-1]
        prev_m = months[-2]
        this = monthly[this_m]
        avg = sum(monthly.values()) / len(monthly)
        items.append({
            'name': name,
            'monthly': monthly,
            'this_month_index': this,
            'vs_avg': round(this / avg, 2) if avg else None,
            'vs_prev_month': round(this / monthly[prev_m], 2) if monthly[prev_m] else None,
        })

    days_this = sum(1 for d in (series.get(GROUPS[0]) or {}) if d[:7] == months[-1])
    payload = {
        'updated_at': dt.datetime.now().strftime('%Y-%m-%d %H:%M'),
        'source': '네이버 데이터랩 검색어트렌드 일간(%s~%s) → 월별 일평균 지수' % (
            start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d')),
        'note': ('각 품목 최다월=100 재정규화, 월 값은 그 달 일별 지수의 일평균'
                 '(이번 달 %s은 %d일치라 월말까지 변동). 일별 데이터는 익일 8~10시간 후 반영. '
                 '품목명은 data.json 표기 그대로'
                 + (', 멜론·라임은 다른 뜻과 섞여 과일 검색어로 좁혀 조회.' if WORD_OVERRIDE else '')
                 ) % (months[-1], days_this),
        'items': items,
    }
    if not dry_run:
        try:
            payload['preempt'] = build_preempt(items, months)
            hot = sum(1 for r in payload['preempt']['items'] if max([x or 0 for x in r['mult']]) >= 1.5)
            print('  선점 후보(1.5배 이상)', hot, '품목')
        except Exception as e:
            print('preempt 계산 건너뜀:', e)
        with open(OUT, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
        print('저장:', OUT, '· 품목', len(items), '· 기간', period)
    else:
        print(json.dumps(payload, ensure_ascii=False)[:800])
    return payload


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true')
    build(ap.parse_args().dry_run)
