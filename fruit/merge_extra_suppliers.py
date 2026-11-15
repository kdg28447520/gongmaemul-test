#!/usr/bin/env python3
"""extra_suppliers.json(동곤 님 보유 과일 도매처)을 data.json의 도매처 목록에 병합한다.

- refresh_snapshot.py 가 매일 아침 data.json 을 새로 쓰므로, 그 마지막에 merge() 를 호출해
  구멍이 스냅샷에 없는 우리 거래처가 지워지지 않게 한다.
- suppliers 배열 끝에 새 항목을 덧붙이기만 한다. specs[][7] 과 specs[][10][*][0] 은
  suppliers 배열의 인덱스라서, 기존 53곳의 순서를 절대 바꾸면 안 된다.

실행:  python3 fruit/merge_extra_suppliers.py     (기존 data.json 에 바로 적용)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
EXTRA = os.path.join(HERE, 'extra_suppliers.json')
DATA = os.path.join(HERE, 'data.json')

BASE_DEFAULTS = {
    'alias': None, 'type': None, 'account': None, 'price': None,
    'flag': None, 'sheet': None, 'order_url': None, 'contact': None,
}

PLATFORM_TYPE = {
    'adminplus': '파트너 B2B',
    'gsheet': '구글시트 단가표',
    'baljuora': '발주오라',
    'direct': '자체 몰',
}


def load_extra(path=EXTRA):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def merge(payload, extra=None):
    """payload(dict) 를 제자리에서 보강하고 같은 dict 를 돌려준다."""
    extra = extra or load_extra()
    sups = payload.setdefault('suppliers', [])
    by_id = {s.get('id'): s for s in sups}
    by_name = {s.get('name'): s for s in sups}
    existing = len(sups)

    for s in sups:
        for k, v in BASE_DEFAULTS.items():
            s.setdefault(k, v)
        if not s.get('type') or s.get('type') == '파트너 B2B(단가 로그인)':
            s['type'] = PLATFORM_TYPE.get(s.get('platform'), None) or s.get('type') or '도매처'
        s.setdefault('source', 'gum')
        s.setdefault('own', False)

    added = 0
    for e in extra.get('suppliers', []):
        tgt = by_id.get(e.get('id')) or by_name.get(e.get('name'))
        if tgt is None and e.get('alias'):
            tgt = by_name.get(e['alias'])
        if tgt is not None:  # 이미 목록에 있으면 중복 추가 없이 우리 보유 정보만 얹는다
            for k, v in e.items():
                if k == 'note' and tgt.get('note'):
                    tgt['note'] = v
                else:
                    tgt[k] = v
            tgt['own'] = True
            tgt['source'] = 'own'
            continue
        rec = {'id': e['id'], 'name': e['name'], 'url': e.get('url'),
               'platform': e.get('platform', 'direct'), 'items': e.get('items'),
               'last': e.get('last'), 'active': e.get('active', True),
               'note': e.get('note'), 'gum': False, 'own': True, 'source': 'own'}
        for k, v in BASE_DEFAULTS.items():
            rec.setdefault(k, v)
        for k, v in e.items():
            rec[k] = v
        sups.append(rec)
        by_id[rec['id']] = rec
        by_name[rec['name']] = rec
        added += 1

    for en in extra.get('enrich', []):
        tgt = by_id.get(en.get('id')) or by_name.get(en.get('name'))
        if not tgt:
            print('  enrich 대상 없음:', en.get('id') or en.get('name'))
            continue
        for k, v in en.items():
            if k in ('id', 'name'):
                continue
            tgt[k] = v

    payload['suppliers'] = sups
    payload['supplier_total'] = len(sups)
    payload['own_count'] = sum(1 for s in sups if s.get('own'))
    payload['gum_count'] = len(sups) - payload['own_count']
    payload['extra_updated'] = extra.get('updated')
    print(f'  도매처 {existing} → {len(sups)}곳 (신규 {added} · 내 보유 {payload["own_count"]})')
    return payload


def main():
    with open(DATA, encoding='utf-8') as f:
        payload = json.load(f)
    merge(payload)
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
    print(DATA, '갱신 완료')


if __name__ == '__main__':
    main()
