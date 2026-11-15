#!/usr/bin/env python3
"""도매 공급가 스냅샷을 다시 받아 data.json을 갱신한다.

실행:  python3 fruit/refresh_snapshot.py
갱신 후 fruit/index.html 의 fetch('data.json?v=YYYYMMDD') 버전 문자열을 오늘 날짜로 바꾼다.
(브라우저에 저장된 예전 data.json을 쓰지 않게 하려는 것)
"""
import json
import os
import re
import urllib.request

K = 'sb_publishable_XsFJFllSfCCEtbgeb_5VXA_4gKWthjb'
U = 'https://kotlqerjhtqtbxfzwenq.supabase.co/rest/v1'
HERE = os.path.dirname(os.path.abspath(__file__))
COLS = ('spec_key,item_group,variety,quality,size_grade,weight_kg,unit_price,price,'
        'price_per_kg,supplier_id,supplier_name,order_cutoff,stock_state,'
        'supplier_count,group_min,group_max,spread_ratio,is_reliable,raw_name')
GROUPS = ['사과', '감', '감귤', '배', '포도', '복숭아', '자두', '살구', '딸기', '수박',
          '참외', '멜론', '키위', '망고', '바나나', '오렌지', '레몬', '자몽', '라임',
          '블루베리', '체리', '석류', '대추', '곶감', '아보카도', '용과', '무화과']


def get(path, rng=None):
    req = urllib.request.Request(f'{U}/{path}')
    req.add_header('apikey', K)
    req.add_header('Authorization', 'Bearer ' + K)
    if rng:
        req.add_header('Range', rng)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def kgp(r):
    if r.get('price_per_kg'):
        return r['price_per_kg']
    if r.get('weight_kg'):
        return round(r['price'] / r['weight_kg'])
    return None


def host(u):
    return re.sub(r'^https?://', '', u or '').split('/')[0]


def main():
    rows, off = [], 0
    base = f'sb_v_compare?select={COLS}&stock_state=eq.selling&supplier_count=gte.2&order=spec_key.asc'
    while True:
        chunk = get(base, f'{off}-{off + 999}')
        rows.extend(chunk)
        print(f'  {len(rows)} rows', flush=True)
        if len(chunk) < 1000:
            break
        off += 1000

    sup_all = get('sb_supplier?select=*&order=sort_order.asc&limit=200')
    sup_pub = {x['id']: x for x in get('sb_v_supplier_public?select=*&order=sort_order.asc')}
    b2b = get('b2b_sites?select=*&order=order_index.asc,created_at.asc&limit=200')

    gurls = {b['url'] for b in b2b}
    gnames = {b['title'] for b in b2b}
    sup = []
    for s in sup_all:
        p = sup_pub.get(s['id'], {})
        sup.append({'id': s['id'], 'name': s['name'], 'url': s['partner_url'],
                    'platform': s['platform'], 'items': p.get('item_count'),
                    'last': (p.get('last_seen_at') or '')[:10] or None,
                    'active': s['is_active'], 'note': s.get('note'),
                    'gum': any(s['id'] in u for u in gurls) or s['name'] in gnames})
    known = {s['name'] for s in sup}
    for b in b2b:
        if b['title'] in known:
            continue
        sup.append({'id': host(b['url']), 'name': b['title'], 'url': b['url'],
                    'platform': 'direct', 'items': None, 'last': None,
                    'active': True, 'note': None, 'gum': True})
    sidx = {s['id']: i for i, s in enumerate(sup)}

    specs = {}
    for r in rows:
        if r['item_group'] in GROUPS and r['supplier_id'] in sidx and kgp(r):
            specs.setdefault(r['spec_key'], []).append(r)

    out = []
    for rs in specs.values():
        rs.sort(key=lambda r: kgp(r))
        h = rs[0]
        out.append([GROUPS.index(h['item_group']), h.get('variety'), h.get('quality'),
                    h.get('size_grade'), h.get('weight_kg'), kgp(h), h['price'],
                    sidx[h['supplier_id']], len(rs), kgp(rs[-1]),
                    [[sidx[r['supplier_id']], r['price'], kgp(r), r.get('order_cutoff')]
                     for r in rs[:3]]])
    out.sort(key=lambda x: (x[0], x[5]))

    fruit_rows = [r for r in rows if r['item_group'] in GROUPS]
    try:
        last = get('sb_v_last_sync?select=finished_at&limit=1')[0]['finished_at']
        import datetime as _dt
        t = _dt.datetime.fromisoformat(last.replace('Z', '+00:00'))
        synced = (t + _dt.timedelta(hours=9)).strftime('%Y-%m-%d %H:%M')
    except Exception as e:  # 원본 동기화 시각을 못 읽으면 지금 시각으로 둔다
        print('last_sync 조회 실패:', e)
        synced = os.popen("TZ=Asia/Seoul date '+%Y-%m-%d %H:%M'").read().strip()
    payload = {
        'as_of': os.popen('date +%Y-%m-%d').read().strip(),
        'offer_rows': len(fruit_rows),
        'supplier_count': len({r['supplier_id'] for r in fruit_rows}),
        'spec_count': len({r['spec_key'] for r in fruit_rows}),
        'synced_at_kst': synced,
        'fetched_at_kst': os.popen("TZ=Asia/Seoul date '+%Y-%m-%d %H:%M'").read().strip(),
        'source': '구멍이 클래스 공개 도매가 비교(스카우트) 공급가 스냅샷',
        'groups': GROUPS,
        'suppliers': sup,
        'specs': out,
    }
    path = os.path.join(HERE, 'data.json')
    with open(path, 'w') as f:
        json.dump(payload, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{path}: 규격 {len(out)} · 업체 {len(sup)} · 공급가 {len(fruit_rows)}')

    # index.html 의 데이터 캐시 버전을 갱신한다 (예전 data.json 을 계속 쓰지 않게)
    idx = os.path.join(HERE, 'index.html')
    if os.path.exists(idx):
        ver = synced.replace('-', '').replace(':', '').replace(' ', '')
        html = open(idx, encoding='utf-8').read()
        new = re.sub(r"data\.json\?v=[0-9A-Za-z]+", 'data.json?v=' + ver, html)
        if new != html:
            open(idx, 'w', encoding='utf-8').write(new)
            print('index.html 데이터 버전:', ver)


if __name__ == '__main__':
    main()
