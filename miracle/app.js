/* 《미라클 소싱기》 app.js — 2026-11-26
   계산식 출처: 셀스위치온(sellswitchon.com) 공개 화면의 마진 계산기·순수익 마진계산기·토스 마진/광고 ROAS 공식
   데이터: gongmaemul-test/fruit/data.json(도매 공급가 스냅샷) + 도매마스터 DB(공산품) → miracle/data.json
*/
'use strict';

/* ── helpers ─────────────────────────────── */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const toNum = s => { const v = parseFloat(String(s == null ? '' : s).replace(/[^\d.]/g, '')); return isFinite(v) ? v : 0; };
const blank = s => String(s == null ? '' : s).trim() === '';
const won = n => Math.round(n).toLocaleString('ko-KR');
const money = n => { const r = Math.round(n); return (r < 0 ? '−' : '') + won(Math.abs(r)) + '원'; };
const pct = n => (Math.round(n * 100) / 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '%';
const pct1 = n => (Math.round(n * 10) / 10).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const moneyVal = v => blank(v) ? '' : won(toNum(v));
const toastEl = $('#toast');
let toastT = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('ms-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ms-' + k, JSON.stringify(v)); } catch (e) { } },
  del(k) { try { localStorage.removeItem('ms-' + k); } catch (e) { } }
};
async function copyText(t, msg) {
  try {
    await navigator.clipboard.writeText(t);
    toast(msg || '복사했습니다');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg || '복사했습니다'); } catch (e2) { toast('복사하지 못했습니다'); }
    ta.remove();
  }
}

/* ── 마켓 수수료 ─────────────────────────── */
const MKT = {
  coupang: { name: '쿠팡', sale: 10.6, pay: 0, vat: 10, ad: null, src: '판매수수료 10.6% + 부가세 10% = 11.66%' },
  toss: { name: '토스쇼핑', sale: 8, pay: 1.6, vat: 10, ad: 1.76, src: '결제 1.6% + 판매 8% + 부가세 10% = 10.56% · 광고 주문 1.76%' }
};
const baseRate = m => m.sale + m.pay;                     /* 수수료율(부가세 전) */
const effRate = m => baseRate(m) * (1 + m.vat / 100);     /* 일반 주문 실부담 */
const adRate = m => m.ad != null ? m.ad : baseRate(m) * (1 + m.vat / 100); /* 광고 주문 실부담 */

/* 마진: 예상 순수익 = (쿠폰적용 최종가 − 원가) − 최종가 × (수수료율 + 부가세율) */
function marginOf(row, m) {
  const cost = toNum(row.cost), price = toNum(row.price);
  if (blank(row.price)) return { empty: true };
  const coupon = blank(row.coupon) ? price : toNum(row.coupon);
  const fee = coupon * baseRate(m) / 100;
  const vat = fee * m.vat / 100;
  const net = (coupon - cost) - fee - vat;
  return { empty: false, coupon, fee, vat, net, rate: coupon > 0 ? net / coupon * 100 : null, disc: price - coupon };
}
/* 광고 ROAS: 광고 가능 금액 = 판매가 − 원가 − 판매가 × 광고주문 수수료 → 최소 ROAS = 판매가 ÷ (광고가능 ÷ 1.1) */
function roasOf(price, cost, rate) {
  if (!(price > 0)) return null;
  const avail = price - cost - price * rate / 100;
  if (avail <= 0) return { no: true, avail };
  const min = price / (avail / 1.1) * 100;
  return { avail, min, rec: min * 1.5 };
}

/* ── 앱 상태 ─────────────────────────────── */
const S = {
  tab: 'sourcing',
  /* 소싱 */
  q: '', g: '', sort: 'kg', own: false, thin: false, limit: 60, open: null,
  /* 공산품 */
  gq: '', gv: '', gprice: false, glimit: 60, gmul: 2,
  /* 계산기 */
  mkt: 'coupang',
  sheets: [], cur: 0,
  nm: [], nmExp: { per: '', count: '', goods: '' },
  /* 4마켓 */
  mk: { cost: '', price: '', target: 20 },
  mkRates: {
    coupang: { g: 11.66, ad: 11.66 },
    toss: { g: 10.56, ad: 1.76 },
    smartstore: { g: 6.63, ad: 6.63 },
    danggeun: { g: 3.6, ad: 3.6 }
  }
};

let DATA = null;
const SUP = () => DATA.suppliers;
const seasonOf = (name, group) => (DATA.season && (DATA.season[name] || DATA.season[group])) || null;

/* ══════════════════ 탭 ══════════════════ */
function setTab(t) {
  S.tab = t;
  $$('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  $$('.panel').forEach(p => { p.hidden = p.id !== 'view-' + t; });
  if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]');
  if (b) setTab(b.dataset.tab);
});
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a && a.getAttribute('href').length > 1) {
    const t = a.getAttribute('href').slice(1);
    if ($('#view-' + t)) { e.preventDefault(); setTab(t); }
  }
});
window.addEventListener('hashchange', () => {
  const t = location.hash.slice(1);
  if (t && $('#view-' + t) && t !== S.tab) setTab(t);
});

/* ══════════════════ 소싱 탐색 ══════════════════ */
function specName(s) {
  const g = DATA.groups[s[0]], parts = [g];
  if (s[1] && s[1] !== g) parts.push(s[1]);
  return parts.join(' ');
}
function specQuery(s) {
  const sup = SUP()[s[7]] ? SUP()[s[7]].name : '';
  return [DATA.groups[s[0]], s[1], s[2], s[3], s[4] + 'kg', sup].filter(Boolean).join(' ').toLowerCase();
}
function sourcingList() {
  let list = DATA.specs.map((s, i) => ({ i, s }));
  if (S.g) list = list.filter(x => DATA.groups[x.s[0]] === S.g);
  if (S.q) { const q = S.q.toLowerCase(); list = list.filter(x => specQuery(x.s).includes(q)); }
  if (S.own) list = list.filter(x => { const u = SUP()[x.s[7]]; return u && u.own; });
  if (S.thin) list = list.filter(x => x.s[8] <= 3);
  const se = x => { const v = seasonOf(x.s[1], DATA.groups[x.s[0]]); return v && v.now != null ? v.now : -1; };
  if (S.sort === 'kg') list.sort((a, b) => a.s[5] - b.s[5] || b.s[8] - a.s[8]);
  else if (S.sort === 'cnt') list.sort((a, b) => b.s[8] - a.s[8] || a.s[5] - b.s[5]);
  else if (S.sort === 'season') list.sort((a, b) => se(b) - se(a) || a.s[5] - b.s[5]);
  else if (S.sort === 'gap') list.sort((a, b) => (b.s[9] / Math.max(1, b.s[5])) - (a.s[9] / Math.max(1, a.s[5])));
  return list;
}
function renderSourcing() {
  const list = sourcingList();
  const shown = list.slice(0, S.limit);
  $('#sRows').innerHTML = shown.length ? shown.map(({ i, s }) => {
    const sup = SUP()[s[7]] || {};
    const season = seasonOf(s[1], DATA.groups[s[0]]);
    const ratio = s[9] && s[5] ? s[9] / s[5] : 1;
    const open = S.open === i;
    const tags = [
      s[2] ? `<span class="tag">${esc(s[2])}</span>` : '',
      s[3] ? `<span class="tag">${esc(s[3])}</span>` : '',
      `<span class="tag">${s[4]}kg</span>`,
      sup.own ? '<span class="tag">가입·승인</span>' : ''
    ].join('');
    const detail = open ? `<div class="s-detail">
      <table><thead><tr><th>도매처</th><th style="text-align:right">규격가(${s[4]}kg)</th><th style="text-align:right">kg당</th><th>출고마감</th></tr></thead><tbody>
      ${(s[10] || []).map(o => {
        const u = SUP()[o[0]] || {};
        return `<tr><td>${esc(u.name || '-')}${u.own ? ' <span class="mini-tag">가입</span>' : ''}</td><td class="n">${won(o[1])}원</td><td class="n">${won(o[2])}원</td><td>${esc(o[3] || '—')}</td></tr>`;
      }).join('')}</tbody></table>
      <div class="act">
        <button type="button" class="btn primary sm" data-add-kg="${i}">1·2·3·5·10kg 계산기에 넣기</button>
        ${sup.url ? `<a class="btn ghost sm" href="${esc(sup.url)}" target="_blank" rel="noopener">도매처 열기</a>` : ''}
        <span class="help">원가는 kg당 ${won(s[5])}원 × 중량으로 넣습니다. 배송비는 도매처 정책을 확인해 더하세요.</span>
      </div></div>` : '';
    return `<div class="s-row${open ? ' open' : ''}" data-spec="${i}">
      <div class="s-name"><div class="t">${esc(specName(s))}</div><div class="m">${tags}</div></div>
      <div class="r s-kg">${won(s[5])}<small>원/kg</small><div class="help">${won(s[6])}원</div></div>
      <div class="s-sup">${esc(sup.name || '-')}</div>
      <div class="r s-cnt"><b>${s[8]}</b>곳</div>
      <div class="season" title="이번 달 네이버 검색 지수(최대 100) · 연평균 대비">${season && season.now != null ? `<b class="${season.vs > 1 ? 'up' : ''}">${season.now.toFixed(0)}</b><span class="${season.vs > 1 ? 'up' : ''}">${season.vs ? (season.vs > 1 ? '▲' : '▼') + Math.abs((season.vs - 1) * 100).toFixed(0) + '%' : '지수'}</span>` : '<span class="help">—</span>'}</div>
      <div class="s-act r"><button type="button" class="icon-btn" aria-label="펼치기">${open ? '▲' : '▼'}</button></div>
      ${detail}
    </div>`;
  }).join('') : `<div class="empty">조건에 맞는 규격이 없습니다. 검색어나 필터를 바꿔 보세요.</div>`;
  $('#sCount').textContent = `${won(list.length)}개 규격 중 ${won(Math.min(S.limit, list.length))}개 표시`;
  $('#sMore').hidden = list.length <= S.limit;

  /* 통계 */
  const offers = DATA.specs.reduce((n, s) => n + (s[10] ? s[10].length : 0), 0);
  $('#sStats').innerHTML = `
    <div><div class="k">도매처</div><div class="v">${DATA.suppliers.length}<small>곳</small></div></div>
    <div><div class="k">규격(품목·등급·중량)</div><div class="v">${won(DATA.specs.length)}<small>개</small></div></div>
    <div><div class="k">비교 공급가</div><div class="v">${won(offers)}<small>건</small></div></div>
    <div><div class="k">공급가 갱신</div><div class="v" style="font-size:15px">${esc(DATA.as_of || '-')}<small>${esc(DATA.synced_at ? DATA.synced_at.slice(11) : '')}</small></div></div>`;
  $('#sSupCount').textContent = DATA.suppliers.length;
}
function renderGroups() {
  const chips = [`<button type="button" data-g="" aria-pressed="${!S.g}">전체</button>`];
  DATA.groups.forEach(g => {
    const n = DATA.specs.filter(s => DATA.groups[s[0]] === g).length;
    if (!n) return;
    chips.push(`<button type="button" data-g="${esc(g)}" aria-pressed="${S.g === g}">${esc(g)} <small>${n}</small></button>`);
  });
  $('#sGroups').innerHTML = chips.join('');
}
$('#sGroups').addEventListener('click', e => {
  const b = e.target.closest('button[data-g]');
  if (!b) return;
  S.g = b.dataset.g; S.limit = 60; S.open = null;
  renderGroups(); renderSourcing();
});
$('#sQ').addEventListener('input', e => { S.q = e.target.value.trim(); S.limit = 60; renderSourcing(); });
$('#sSort').addEventListener('change', e => { S.sort = e.target.value; renderSourcing(); });
$('#sOwn').addEventListener('change', e => { S.own = e.target.checked; renderSourcing(); });
$('#sThin').addEventListener('change', e => { S.thin = e.target.checked; renderSourcing(); });
$('#sMore').addEventListener('click', () => { S.limit += 60; renderSourcing(); });
$('#sRows').addEventListener('click', e => {
  const add = e.target.closest('[data-add-kg]');
  if (add) {
    e.stopPropagation();
    const s = DATA.specs[+add.dataset.addKg];
    addSpecToCalc(s);
    return;
  }
  const row = e.target.closest('.s-row');
  if (!row) return;
  const i = +row.dataset.spec;
  S.open = S.open === i ? null : i;
  renderSourcing();
});

/* 소싱 → 마진 계산기 */
function addSpecToCalc(s) {
  const perKg = s[5];
  const name = specName(s) + (s[2] ? ' ' + s[2] : '');
  [1, 2, 3, 5, 10].forEach(kg => {
    S.sheets[S.cur].rows.push({ name: `${name} ${kg}kg`, cost: String(perKg * kg), price: '', coupon: '' });
  });
  saveSheets(); renderCalc();
  setTab('calc');
  toast(`kg당 ${won(perKg)}원으로 1·2·3·5·10kg 원가를 넣었습니다. 판매가를 채우세요.`);
}

/* ══════════════════ 키워드 확인 ══════════════════ */
$('#kwForm').addEventListener('submit', e => {
  e.preventDefault();
  const q = $('#kwQ').value.trim();
  if (!q) return;
  const ql = q.toLowerCase();
  const hit = DATA.specs.map((s, i) => ({ i, s })).filter(({ s }) => specQuery(s).includes(ql));
  let html = '';
  if (hit.length) {
    hit.sort((a, b) => a.s[5] - b.s[5]);
    const best = hit[0].s, season = seasonOf(best[1], DATA.groups[best[0]]);
    html += `<div class="kw-sum"><b>${esc(q)}</b> · 도매 규격 <b>${won(hit.length)}개</b> · 도매처 <b>${won(Math.max(...hit.map(h => h.s[8])))}곳</b> · kg당 최저 <b>${won(best[5])}원</b>
      ${season && season.now != null ? ` · 이번 달 수요지수 <b>${season.now.toFixed(0)}</b> (평균 대비 ${season.vs > 1 ? '+' : ''}${((season.vs - 1) * 100).toFixed(0)}%)` : ''}</div>`;
    html += `<div class="tbl-wrap"><table class="tbl kw-tbl"><thead><tr><th>품목 · 규격</th><th class="r">kg당</th><th class="r">규격가</th><th>최저 도매처</th><th class="r">공급처</th></tr></thead><tbody>` +
      hit.slice(0, 8).map(({ i, s }) => `<tr><td>${esc(specName(s))}${s[2] ? ' · ' + esc(s[2]) : ''} · ${s[4]}kg</td><td class="r">${won(s[5])}원</td><td class="r">${won(s[6])}원</td><td>${esc((SUP()[s[7]] || {}).name || '-')}</td><td class="r">${s[8]}곳</td></tr>`).join('') +
      `</tbody></table></div>` + (hit.length > 8 ? `<p class="help" style="margin:6px 0 0">상위 8개만 표시 — 위 검색창에 키워드를 넣으면 전체가 나옵니다.</p>` : '');
  } else {
    html += `<div class="kw-sum"><b>${esc(q)}</b> — 우리 도매 DB에 일치하는 규격이 없습니다. 도매처에 문의하거나 품종·등급을 바꿔 검색해 보세요.</div>`;
  }
  const u = encodeURIComponent(q);
  html += `<div class="kw-links">
    <a class="btn ghost sm" href="https://www.coupang.com/np/search?q=${u}" target="_blank" rel="noopener">쿠팡에서 "${esc(q)}" 검색</a>
    <a class="btn ghost sm" href="https://datalab.naver.com/keyword/trendSearch.naver" target="_blank" rel="noopener">네이버 데이터랩 (검색어 붙여넣기)</a>
    <a class="btn ghost sm" href="https://datalab.naver.com/shoppingInsight/sCategory.naver" target="_blank" rel="noopener">쇼핑인사이트</a>
    <button type="button" class="btn ghost sm" data-kwcopy="${esc(q)}">키워드 복사</button>
  </div>`;
  $('#kwOut').innerHTML = html;
});
$('#kwOut').addEventListener('click', e => {
  const b = e.target.closest('[data-kwcopy]');
  if (b) copyText(b.dataset.kwcopy, '키워드를 복사했습니다');
});

/* ══════════════════ 공산품 ══════════════════ */
function shipFee(w) {
  const m = String(w.ship || '').replace(/,/g, '').match(/(\d+)\s*원/);
  return m ? +m[1] : 0;
}
function goodsList() {
  let list = DATA.wholesale || [];
  if (S.gv) list = list.filter(w => w.v === S.gv);
  if (S.gprice) list = list.filter(w => w.dp);
  if (S.gq) { const q = S.gq.toLowerCase(); list = list.filter(w => (w.n + ' ' + w.sup + ' ' + w.tag + ' ' + w.v).toLowerCase().includes(q)); }
  return list;
}
function renderGoods() {
  const list = goodsList();
  const shown = list.slice(0, S.glimit);
  const sug = dp => Math.ceil(dp * S.gmul / 100) * 100;
  $('#gRows').innerHTML = shown.length ? shown.map(w => {
    const sf = shipFee(w), cost = w.dp ? w.dp + sf : null;
    const sp = w.dp ? sug(w.dp) : null;
    const m = cost && sp ? marginOf({ cost, price: sp }, MKT.coupang) : null;
    return `<div class="g-row" data-w="${esc(w.p)}|${esc(w.v)}">
      <div class="g-name"><div class="t">${esc(w.n)}</div><div class="m">${esc(w.v)} · ${esc(w.sup || '-')}${w.tag ? ' · ' + esc(w.tag) : ''}${w.moq && w.moq !== '1' ? ' · MOQ ' + esc(w.moq) : ''}${w.ship ? ' · 배송 ' + esc(w.ship) : ''}</div></div>
      <div class="r g-price">${w.dp ? `<b>${won(w.dp)}원</b>` : `<span class="help">미노출</span>`}</div>
      <div class="r g-rp">${sp ? won(sp) + '원' : '—'}</div>
      <div class="r g-margin">${m ? `<b class="${m.net < 0 ? 'neg' : 'pos'}">${money(m.net)}</b> <span class="help">${pct1(m.rate)}</span>` : '<span class="help">—</span>'}</div>
      <div class="r g-act">${w.dp ? `<button type="button" class="btn ghost sm" data-add-w="${esc(w.p)}|${esc(w.v)}">계산기에 넣기</button>` : ''}</div>
    </div>`;
  }).join('') : `<div class="empty">조건에 맞는 상품이 없습니다.</div>`;
  $('#gCountLine').textContent = `${won(list.length)}건 중 ${won(Math.min(S.glimit, list.length))}건 표시`;
  $('#gMore').hidden = list.length <= S.glimit;
  const withPrice = (DATA.wholesale || []).filter(w => w.dp).length;
  const vendors = [...new Set((DATA.wholesale || []).map(w => w.v))];
  $('#gStats').innerHTML = `
    <div><div class="k">확보 상품</div><div class="v">${won((DATA.wholesale || []).length)}<small>건</small></div></div>
    <div><div class="k">도매가 확인</div><div class="v">${won(withPrice)}<small>건</small></div></div>
    <div><div class="k">도매처</div><div class="v">${vendors.length}<small>곳</small></div></div>
    <div><div class="k">마진 기준</div><div class="v" style="font-size:15px">쿠팡 11.66%<small>도매가+배송 × ${S.gmul}</small></div></div>`;
  $('#gMarginHead').textContent = `마진(×${S.gmul})`;
  $('#gCount').textContent = (DATA.wholesale || []).length;
}
function renderVendors() {
  const vendors = [...new Set((DATA.wholesale || []).map(w => w.v))];
  $('#gVendor').innerHTML = '<option value="">도매처 전체</option>' + vendors.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
}
$('#gQ').addEventListener('input', e => { S.gq = e.target.value.trim(); S.glimit = 60; renderGoods(); });
$('#gVendor').addEventListener('change', e => { S.gv = e.target.value; S.glimit = 60; renderGoods(); });
$('#gPrice').addEventListener('change', e => { S.gprice = e.target.checked; renderGoods(); });
$('#gMul').addEventListener('change', e => { const v = parseFloat(String(e.target.value).replace(/[^\d.]/g, '')); S.gmul = v > 0 && v < 10 ? v : 2; e.target.value = S.gmul; renderGoods(); });
$('#gMore').addEventListener('click', () => { S.glimit += 60; renderGoods(); });
$('#gRows').addEventListener('click', e => {
  const add = e.target.closest('[data-add-w]');
  if (add) {
    const [p, v] = add.dataset.addW.split('|');
    const w = (DATA.wholesale || []).find(x => x.p === p && x.v === v);
    if (!w) return;
    S.sheets[S.cur].rows.push({ name: w.n, cost: String(w.dp + shipFee(w)), price: String(Math.ceil(w.dp * S.gmul / 100) * 100), coupon: '' });
    saveSheets(); renderCalc(); setTab('calc');
    toast('마진 계산기에 넣었습니다.');
    return;
  }
  const row = e.target.closest('.g-row');
  if (!row) return;
  const [p, v] = row.dataset.w.split('|');
  const w = (DATA.wholesale || []).find(x => x.p === p && x.v === v);
  if (w && w.u) window.open(w.u, '_blank', 'noopener');
});

/* ══════════════════ 마진 계산기 ══════════════════ */
function newSheet(name) {
  return { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name || '시트 1', rows: [], comps: [], ads: [] };
}
function loadSheets() {
  const saved = store.get('sheets-v1', null);
  if (saved && Array.isArray(saved.sheets) && saved.sheets.length) {
    S.sheets = saved.sheets.map(s => ({
      id: s.id || 's' + Math.random().toString(36).slice(2, 8),
      name: s.name || '시트',
      rows: (s.rows || []).map(r => ({ name: r.name || '', cost: r.cost || '', price: r.price || '', coupon: r.coupon || '' })),
      comps: (s.comps || []).slice(0, 5).map(c => ({ name: c.name || '', p: (c.p || []).slice(0, 5).concat(['', '', '', '', '']).slice(0, 5) })),
      ads: (s.ads || []).map(a => ({ name: a.name || '', cost: a.cost || '', price: a.price || '' }))
    }));
    S.cur = Math.min(saved.cur || 0, S.sheets.length - 1);
  } else {
    S.sheets = [newSheet('시트 1')];
    S.cur = 0;
  }
  S.mkt = store.get('mkt', 'coupang');
  S.nm = store.get('nm-v1', []);
  S.nmExp = store.get('nmExp-v1', { per: '', count: '', goods: '' });
  S.mk = store.get('mk-v1', S.mk);
  S.mkRates = Object.assign(S.mkRates, store.get('mkRates-v1', {}));
}
function saveSheets() { store.set('sheets-v1', { sheets: S.sheets, cur: S.cur }); }
const curSheet = () => S.sheets[S.cur];
function ensureComps() {
  const s = curSheet();
  while (s.comps.length < 5) s.comps.push({ name: '', p: ['', '', '', '', ''] });
  s.comps.forEach(c => { while (c.p.length < 5) c.p.push(''); });
  return s.comps;
}
function ensureAds() {
  const s = curSheet();
  while (s.ads.length < 4) s.ads.push({ name: '', cost: '', price: '' });
  return s.ads;
}

function renderChips() {
  const s = curSheet();
  $('#cChips').innerHTML = S.sheets.map((sh, i) =>
    `<button type="button" class="chip" data-sh="${i}" aria-pressed="${i === S.cur}">${esc(sh.name)} <small>${sh.rows.length}</small></button>`
  ).join('') +
    `<button type="button" class="chip add" data-sh-new>+ 시트 추가</button>
     <span style="margin-left:auto;display:flex;gap:6px">
       <button type="button" class="btn ghost sm" data-sh-rename>이름 바꾸기</button>
       <button type="button" class="btn ghost sm" data-sh-del>시트 삭제</button>
     </span>`;
}
function renderFeeLine() {
  const m = MKT[S.mkt];
  $('#feeLine').innerHTML = `일반 판매 <b>${pct(effRate(m))}</b> (수수료 ${baseRate(m)}% + 부가세 ${m.vat}%) · 광고 주문 <b>${pct(adRate(m))}</b> · ROAS는 광고비 VAT 별도 기준`;
}

function calcCells(row) {
  const m = MKT[S.mkt], r = marginOf(row, m);
  if (r.empty) return '<td class="r cc">-</td><td class="r cc">-</td><td class="r cc">-</td><td class="r cc">-</td><td class="r cc">-</td>';
  const cls = r.net < 0 ? 'neg' : 'pos';
  return `<td class="r cc">${money(r.fee)}</td><td class="r cc">${money(r.vat)}</td>
    <td class="r cc ${cls}">${money(r.net)}</td><td class="r cc ${cls}">${pct(r.rate)}</td>
    <td class="r cc">${r.disc ? money(r.disc) : '0원'}</td>`;
}
function renderCalc() {
  const sh = curSheet();
  renderChips();
  renderFeeLine();
  $$('#mktTabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mkt === S.mkt)));

  $('#calcBody').innerHTML = sh.rows.length ? sh.rows.map((r, i) => `<tr data-i="${i}">
    <td><input type="text" data-k="name" value="${esc(r.name)}" placeholder="상품명" aria-label="상품명"></td>
    <td class="r"><input type="text" inputmode="numeric" data-k="cost" value="${esc(moneyVal(r.cost))}" placeholder="금액" aria-label="원가"></td>
    <td class="r"><input type="text" inputmode="numeric" data-k="price" value="${esc(moneyVal(r.price))}" placeholder="금액" aria-label="판매가"></td>
    <td class="r"><input type="text" inputmode="numeric" data-k="coupon" value="${esc(moneyVal(r.coupon))}" placeholder="판매가와 같음" aria-label="쿠폰적용 최종가"></td>
    ${calcCells(r)}
    <td class="delcol"><button type="button" class="icon-btn" data-del="${i}" aria-label="삭제">×</button></td>
  </tr>`).join('') : `<tr><td colspan="10" class="empty" style="padding:26px 10px">상품이 없습니다. 위에 과일 이름을 넣고 [1·2·3·5kg 줄 만들기]를 누르거나 [+ 줄 추가]로 한 줄씩 넣으세요.</td></tr>`;

  /* 합계 */
  let net = 0, rev = 0, n = 0;
  sh.rows.forEach(r => {
    const x = marginOf(r, MKT[S.mkt]);
    if (!x.empty) { net += x.net; rev += x.coupon; n++; }
  });
  $('#calcFoot').innerHTML = n ? `<tr><td colspan="6">합계 ${n}개 상품</td><td class="r ${net < 0 ? 'neg' : 'pos'}">${money(net)}</td><td class="r">${pct(rev > 0 ? net / rev * 100 : 0)}</td><td></td><td></td></tr>` : '';
  $('#calcSum').textContent = n ? `합계 순수익 ${money(net)} · 매출 기준 마진율 ${pct(rev > 0 ? net / rev * 100 : 0)}` : '판매가를 넣으면 순수익이 계산됩니다.';

  renderComps();
  renderRoas();
  renderNm();
}
function refreshCalcRow(tr, i) {
  tr.querySelectorAll('td.cc').forEach(td => td.remove());
  const del = tr.querySelector('td.delcol');
  del.insertAdjacentHTML('beforebegin', calcCells(curSheet().rows[i]));
  /* 합계·ROAS 연결은 다시 계산 */
  const sh = curSheet();
  let net = 0, rev = 0, n = 0;
  sh.rows.forEach(r => { const x = marginOf(r, MKT[S.mkt]); if (!x.empty) { net += x.net; rev += x.coupon; n++; } });
  $('#calcFoot').innerHTML = n ? `<tr><td colspan="6">합계 ${n}개 상품</td><td class="r ${net < 0 ? 'neg' : 'pos'}">${money(net)}</td><td class="r">${pct(rev > 0 ? net / rev * 100 : 0)}</td><td></td><td></td></tr>` : '';
  $('#calcSum').textContent = n ? `합계 순수익 ${money(net)} · 매출 기준 마진율 ${pct(rev > 0 ? net / rev * 100 : 0)}` : '판매가를 넣으면 순수익이 계산됩니다.';
}
$('#calcBody').addEventListener('input', e => {
  const inp = e.target.closest('input');
  if (!inp) return;
  const tr = inp.closest('tr'), i = +tr.dataset.i, k = inp.dataset.k, s = curSheet();
  if (!s.rows[i]) return;
  if (k !== 'name') { const v = inp.value.trim(); inp.value = v === '' ? '' : won(toNum(v)); }
  s.rows[i][k] = inp.value;
  saveSheets();
  if (k !== 'name') refreshCalcRow(tr, i);
});
$('#calcBody').addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  curSheet().rows.splice(+b.dataset.del, 1);
  saveSheets(); renderCalc();
});
$('#mktTabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-mkt]');
  if (!b) return;
  S.mkt = b.dataset.mkt; store.set('mkt', S.mkt); renderCalc();
});
$('#calcAdd').addEventListener('click', () => {
  curSheet().rows.push({ name: '', cost: '', price: '', coupon: '' });
  saveSheets(); renderCalc();
  const l = $('#calcBody tr:last-child input[data-k="name"]');
  if (l) l.focus();
});
$('#calcClear').addEventListener('click', () => {
  if (!curSheet().rows.length) return;
  if (!confirm('이 시트의 상품 줄을 모두 지울까요?')) return;
  curSheet().rows = []; saveSheets(); renderCalc();
});
$('#optForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('#optName').value.trim();
  if (!name) { toast('과일 이름을 먼저 적어 주세요'); $('#optName').focus(); return; }
  const s = curSheet();
  const have = new Set(s.rows.map(r => String(r.name).trim()));
  const add = [1, 2, 3, 5].filter(kg => !have.has(name + ' ' + kg + 'kg'));
  add.forEach(kg => s.rows.push({ name: `${name} ${kg}kg`, cost: '', price: '', coupon: '' }));
  saveSheets(); renderCalc(); $('#optName').value = '';
  toast(add.length ? `${add.join('·')}kg 줄을 만들었습니다` : '이미 1·2·3·5kg 줄이 있습니다');
});
$('#calcDemo').addEventListener('click', () => {
  const s = curSheet();
  const add = [
    { name: '엔비사과 5kg', cost: '12900', price: '22900', coupon: '' },
    { name: '엔비사과 10kg', cost: '23900', price: '38900', coupon: '36900' },
    { name: '황금향 5kg', cost: '18500', price: '29900', coupon: '' },
    { name: '레드향 3kg', cost: '14900', price: '26900', coupon: '24900' }
  ];
  const have = new Set(s.rows.map(r => r.name));
  add.forEach(r => { if (!have.has(r.name)) s.rows.push(r); });
  if (!ensureComps().some(c => c.name)) {
    s.comps[0] = { name: '엔비사과 5kg', p: ['22900', '24900', '21900', '23800', '25500'] };
    s.comps[1] = { name: '황금향 5kg', p: ['29900', '31500', '28900', '', ''] };
  }
  if (!s.ads.some(a => a.name)) {
    s.ads[0] = { name: '엔비사과 5kg', cost: '12900', price: '22900' };
    s.ads[1] = { name: '황금향 5kg', cost: '18500', price: '29900' };
  }
  if (!S.nm.length) S.nm = [
    { name: '엔비사과 5kg', cost: '12900', price: '22900', qty: '120' },
    { name: '황금향 5kg', cost: '18500', price: '29900', qty: '45' }
  ];
  if (!S.nmExp.per) S.nmExp = { per: '6,000', count: '30', goods: '22,900' };
  saveSheets(); saveNm(); renderCalc();
  toast('예시를 채웠습니다. 숫자를 바꾸면 바로 다시 계산됩니다.');
});
$('#csvOut').addEventListener('click', () => {
  const m = MKT[S.mkt], rows = curSheet().rows;
  if (!rows.length) { toast('내려받을 상품이 없습니다'); return; }
  const head = ['상품명', '원가', '판매가', '쿠폰적용 최종가', '수수료', '수수료부가세', '예상순수익', '최종마진율(%)', '할인쿠폰'];
  const lines = rows.map(r => {
    const x = marginOf(r, m);
    return [r.name, toNum(r.cost), toNum(r.price), x.empty ? '' : x.coupon, x.empty ? '' : Math.round(x.fee), x.empty ? '' : Math.round(x.vat), x.empty ? '' : Math.round(x.net), x.empty ? '' : x.rate.toFixed(2), x.empty ? '' : Math.round(x.disc)]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = '\ufeff' + head.join(',') + '\n' + lines.join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `미라클소싱기_마진_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('CSV를 내려받았습니다');
});
/* 시트 */
$('#calcSheets').addEventListener('click', e => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.sh != null) { S.cur = +t.dataset.sh; saveSheets(); renderCalc(); return; }
  if (t.hasAttribute('data-sh-new')) {
    if (S.sheets.length >= 30) { toast('시트는 30개까지 만들 수 있습니다'); return; }
    const name = prompt('새 시트 이름 (20자까지)', '시트 ' + (S.sheets.length + 1));
    if (name == null) return;
    S.sheets.push(newSheet(String(name).slice(0, 20) || '시트 ' + (S.sheets.length + 1)));
    S.cur = S.sheets.length - 1; saveSheets(); renderCalc(); return;
  }
  if (t.hasAttribute('data-sh-rename')) {
    const s = curSheet(); const name = prompt('시트 이름 바꾸기 (20자까지)', s.name);
    if (name == null) return;
    if (String(name).trim()) { s.name = String(name).trim().slice(0, 20); saveSheets(); renderCalc(); }
    return;
  }
  if (t.hasAttribute('data-sh-del')) {
    if (S.sheets.length <= 1) { toast('시트는 최소 1개 남아야 합니다'); return; }
    if (!confirm(`"${curSheet().name}" 시트를 지울까요?`)) return;
    S.sheets.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); saveSheets(); renderCalc();
  }
});

/* ② 경쟁 판매가 → 목표 소싱가 */
function compCalc(c) {
  const v = c.p.filter(x => !blank(x)).map(toNum);
  if (!v.length) return null;
  const avg = v.reduce((a, b) => a + b, 0) / v.length;
  return { avg, target: avg * 0.7 };
}
function renderComps() {
  const comps = ensureComps();
  $('#compBody').innerHTML = comps.map((c, i) => {
    const r = compCalc(c);
    return `<tr data-ci="${i}">
      <td><input type="text" data-ck="name" value="${esc(c.name)}" placeholder="상품명" aria-label="상품명"></td>
      ${c.p.map((x, k) => `<td class="r"><input type="text" inputmode="numeric" data-ck="${k}" value="${esc(moneyVal(x))}" placeholder="금액" aria-label="경쟁 ${k + 1} 판매가"></td>`).join('')}
      <td class="r cc2">${r ? won(r.avg) + '원' : '-'}</td>
      <td class="r cc2 pos">${r ? '<b>' + won(r.target) + '원</b>' : '-'}</td>
    </tr>`;
  }).join('');
}
$('#compBody').addEventListener('input', e => {
  const inp = e.target.closest('input');
  if (!inp) return;
  const tr = inp.closest('tr'), i = +tr.dataset.ci, k = inp.dataset.ck, c = curSheet().comps[i];
  if (!c) return;
  if (k !== 'name') { const v = inp.value.trim(); inp.value = v === '' ? '' : won(toNum(v)); c.p[+k] = inp.value; }
  else c.name = inp.value;
  saveSheets();
  const r = compCalc(c);
  const tds = tr.querySelectorAll('td.cc2');
  if (tds[0]) tds[0].textContent = r ? won(r.avg) + '원' : '-';
  if (tds[1]) tds[1].innerHTML = r ? '<b>' + won(r.target) + '원</b>' : '-';
});

/* ③ 광고 ROAS */
function renderRoas() {
  const ads = ensureAds(), m = MKT[S.mkt], rate = adRate(m);
  $('#roasHelp').innerHTML = S.mkt === 'toss'
    ? '광고 주문은 판매수수료가 면제돼 <b>결제 1.6% + 부가세 = 1.76%</b>만 냅니다. 권장 ROAS는 최소 ROAS × 1.5.'
    : `쿠팡은 광고 주문에도 판매수수료가 붙습니다(<b>${pct(rate)}</b>). 권장 ROAS는 최소 ROAS × 1.5.`;
  $('#roasBody').innerHTML = ads.map((a, i) => {
    const r = roasOf(toNum(a.price), toNum(a.cost), rate);
    let c4 = '<td class="r cc4">-</td><td class="r cc4">-</td>';
    if (blank(a.price)) { /* empty */ }
    else if (!r) { /* */ }
    else if (r.no) c4 = `<td class="r cc4"><span class="neg" title="원가와 수수료가 판매가 이상이라 광고비를 쓸 수 없습니다 (남는 금액 ${money(r.avail)})">광고 불가</span></td><td class="r cc4">-</td>`;
    else c4 = `<td class="r cc4" title="주문당 광고비 한도 ${money(r.avail)} (부가세 별도 ${money(r.avail / 1.1)})"><b>${Math.round(r.min)}%</b></td><td class="r cc4 pos"><b>${Math.round(r.rec)}%</b></td>`;
    return `<tr data-ai="${i}">
      <td><input type="text" data-ak="name" value="${esc(a.name)}" placeholder="상품명" aria-label="상품명"></td>
      <td class="r"><input type="text" inputmode="numeric" data-ak="cost" value="${esc(moneyVal(a.cost))}" placeholder="금액" aria-label="원가"></td>
      <td class="r"><input type="text" inputmode="numeric" data-ak="price" value="${esc(moneyVal(a.price))}" placeholder="금액" aria-label="판매가"></td>
      ${c4}
      <td><button type="button" class="icon-btn" data-adel="${i}" aria-label="삭제">×</button></td>
    </tr>`;
  }).join('');
}
$('#roasBody').addEventListener('input', e => {
  const inp = e.target.closest('input');
  if (!inp) return;
  const tr = inp.closest('tr'), i = +tr.dataset.ai, k = inp.dataset.ak, a = curSheet().ads[i];
  if (!a) return;
  if (k !== 'name') { const v = inp.value.trim(); inp.value = v === '' ? '' : won(toNum(v)); }
  a[k] = inp.value;
  saveSheets();
  /* 그 줄만 다시 계산 */
  const r = roasOf(toNum(a.price), toNum(a.cost), adRate(MKT[S.mkt]));
  let html1 = '-', html2 = '-', cls1 = '', cls2 = '';
  if (!blank(a.price) && r) {
    if (r.no) { html1 = '<span class="neg">광고 불가</span>'; }
    else { html1 = '<b>' + Math.round(r.min) + '%</b>'; html2 = '<b>' + Math.round(r.rec) + '%</b>'; cls2 = 'pos'; }
  }
  tr.querySelectorAll('td.cc4').forEach(td => td.remove());
  tr.querySelector('td:last-child').insertAdjacentHTML('beforebegin',
    `<td class="r cc4 ${cls1}">${html1}</td><td class="r cc4 ${cls2}">${html2}</td>`);
});
$('#roasBody').addEventListener('click', e => {
  const b = e.target.closest('[data-adel]');
  if (!b) return;
  curSheet().ads.splice(+b.dataset.adel, 1);
  saveSheets(); renderRoas();
});
$('#roasAdd').addEventListener('click', () => {
  curSheet().ads.push({ name: '', cost: '', price: '' });
  saveSheets(); renderRoas();
});

/* ④ 순수익 마진계산기 (체험단) */
const NM_RATE = 11.66;
function nmCalc(r) {
  const cost = toNum(r.cost), price = toNum(r.price), qty = toNum(r.qty);
  if (blank(r.price)) return { empty: true };
  const fee = price * NM_RATE / 100, unit = price - cost - fee;
  return { empty: false, fee, unit, rate: price > 0 ? unit / price * 100 : null, qty, net: unit * qty };
}
function nmExpCalc() {
  const per = toNum(S.nmExp.per), count = toNum(S.nmExp.count), goods = toNum(S.nmExp.goods);
  const review = per * count, fee = goods * NM_RATE / 100 * count;
  return { per, count, goods, review, fee, total: review + fee, empty: blank(S.nmExp.per) && blank(S.nmExp.count) && blank(S.nmExp.goods) };
}
function renderNm() {
  const rows = S.nm;
  $('#nmBody').innerHTML = rows.length ? rows.map((r, i) => {
    const c = nmCalc(r);
    const d = x => c.empty ? '-' : x;
    const cls = c.empty ? '' : c.unit < 0 ? 'neg' : 'pos';
    return `<tr data-ni="${i}">
      <td><input type="text" data-nk="name" value="${esc(r.name)}" placeholder="상품명" aria-label="상품명"></td>
      <td class="r"><input type="text" inputmode="numeric" data-nk="cost" value="${esc(moneyVal(r.cost))}" placeholder="금액" aria-label="원가"></td>
      <td class="r"><input type="text" inputmode="numeric" data-nk="price" value="${esc(moneyVal(r.price))}" placeholder="금액" aria-label="판매가"></td>
      <td class="r cc5">${d(money(c.fee))}</td><td class="r cc5 ${cls}">${d(money(c.unit))}</td><td class="r cc5 ${cls}">${d(c.rate == null ? '-' : pct1(c.rate))}</td>
      <td class="r"><input type="text" inputmode="numeric" class="nm-qty" data-nk="qty" value="${esc(r.qty || '')}" placeholder="0" aria-label="판매 개수"></td>
      <td class="r cc6">${c.empty || !c.qty ? '-' : money(c.net)}</td>
      <td><button type="button" class="icon-btn" data-ndel="${i}" aria-label="삭제">×</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="9" class="empty" style="padding:22px 10px">줄이 없습니다. [+ 줄 추가]를 누르고 원가·판매가·판매 개수를 넣으세요.</td></tr>`;

  if (document.activeElement !== $('#nmPer')) $('#nmPer').value = S.nmExp.per;
  if (document.activeElement !== $('#nmCnt')) $('#nmCnt').value = S.nmExp.count;
  if (document.activeElement !== $('#nmGoods')) $('#nmGoods').value = S.nmExp.goods;
  paintNmExp();
  paintNmTotal();
}
function paintNmExp() {
  const ex = nmExpCalc();
  $('#nmExpOut').innerHTML = ex.empty ? '체험단을 안 했으면 비워 두세요.'
    : `리뷰비 합계 <b>${money(ex.review)}</b><br>체험단 수수료 <b>${money(ex.fee)}</b> <span class="help">(물건값 × ${NM_RATE}% × 개수)</span><br>최종 체험단 비용 <b>${money(ex.total)}</b>`;
}
function paintNmTotal() {
  const ex = nmExpCalc();
  const net = S.nm.reduce((n, r) => { const c = nmCalc(r); return n + (c.empty ? 0 : c.net); }, 0);
  const qty = S.nm.reduce((n, r) => n + (blank(r.price) ? 0 : toNum(r.qty)), 0);
  const real = net - ex.total;
  $('#nmTotal').innerHTML = `<div class="nm-total-line">
      <span>실제 판매 개수 <b>${won(qty)}개</b></span>
      <span>순수익 <b class="${net < 0 ? 'neg' : ''}">${money(net)}</b></span>
      <span>체험단 비용 <b class="${ex.total > 0 ? 'neg' : ''}">${money(-ex.total)}</b></span>
    </div>
    <div class="nm-total-big"><span>실제 순수익</span><strong class="${real < 0 ? 'neg' : ''}">${money(real)}</strong><span class="help">체험단 비용은 합계에서 한 번만 뺍니다</span></div>`;
}
function saveNm() { store.set('nm-v1', S.nm); store.set('nmExp-v1', S.nmExp); }
$('#nmBody').addEventListener('input', e => {
  const inp = e.target.closest('input');
  if (!inp) return;
  const tr = inp.closest('tr'), i = +tr.dataset.ni, k = inp.dataset.nk, r = S.nm[i];
  if (!r) return;
  if (k !== 'name') { const v = inp.value.trim(); inp.value = v === '' ? '' : won(toNum(v)); }
  r[k] = inp.value;
  saveNm();
  const c = nmCalc(r), d = x => c.empty ? '-' : x, cls = c.empty ? '' : c.unit < 0 ? 'neg' : 'pos';
  tr.querySelectorAll('td.cc5').forEach(td => td.remove());
  tr.querySelector('.nm-qty').closest('td').insertAdjacentHTML('beforebegin',
    `<td class="r cc5">${d(money(c.fee))}</td><td class="r cc5 ${cls}">${d(money(c.unit))}</td><td class="r cc5 ${cls}">${d(c.rate == null ? '-' : pct1(c.rate))}</td>`);
  const cc6 = tr.querySelector('td.cc6');
  if (cc6) cc6.innerHTML = c.empty || !c.qty ? '-' : money(c.net);
  paintNmTotal();
});
$('#nmBody').addEventListener('click', e => {
  const b = e.target.closest('[data-ndel]');
  if (!b) return;
  S.nm.splice(+b.dataset.ndel, 1); saveNm(); renderNm();
});
['nmPer', 'nmCnt', 'nmGoods'].forEach(id => {
  $('#' + id).addEventListener('input', e => {
    const k = id === 'nmPer' ? 'per' : id === 'nmCnt' ? 'count' : 'goods';
    const v = e.target.value.trim();
    e.target.value = v === '' ? '' : won(toNum(v));
    S.nmExp[k] = e.target.value; saveNm();
    paintNmExp();
    paintNmTotal();
  });
});
/* nm 줄 추가 버튼은 카드 ④ 표 아래에 없으므로 표 머리에 추가 */
(function addNmButton() {
  const tools = $('#nmBody').closest('.card').querySelector('.nm-exp');
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn ghost sm'; btn.textContent = '+ 줄 추가';
  btn.addEventListener('click', () => {
    S.nm.push({ name: '', cost: '', price: '', qty: '' });
    saveNm(); renderNm();
  });
  tools.parentNode.insertBefore(btn, tools);
})();

/* ══════════════════ 4마켓 비교 ══════════════════ */
const MK_ROWS = [
  { key: 'coupang', name: '쿠팡', note: '판매수수료 10.6% + 부가세' },
  { key: 'toss', name: '토스쇼핑', note: '결제 1.6% + 판매 8% + 부가세' },
  { key: 'smartstore', name: '스마트스토어', note: 'Npay 3.63% + 판매 3% (영세 4.95%)' },
  { key: 'danggeun', name: '당근', note: '당근페이 결제 수수료 기준' }
];
function renderMarkets() {
  $('#mkCost').value = S.mk.cost === '' ? '' : won(toNum(S.mk.cost));
  $('#mkPrice').value = S.mk.price === '' ? '' : won(toNum(S.mk.price));
  $('#mkTarget').value = S.mk.target;
  const cost = toNum(S.mk.cost), price = toNum(S.mk.price), target = toNum(S.mk.target);
  const m = MKT[S.mkt];
  $('#mkHint').textContent = '원가는 공급가에 도매처 배송비까지 더한 금액으로 넣으세요. 수수료율은 표에서 직접 고칠 수 있고, 고친 값은 이 브라우저에 저장됩니다.';
  let best = null, results = [];
  MK_ROWS.forEach(r => {
    const rates = S.mkRates[r.key];
    const g = toNum(rates.g), ad = toNum(rates.ad);
    const fee = price * g / 100, net = price - cost - fee;
    const rr = roasOf(price, cost, ad);
    const minPrice = target < 100 ? cost / (1 - g / 100 - target / 100) : null;
    results.push({ r, g, ad, fee, net, netRate: price > 0 ? net / price * 100 : 0, rr, minPrice });
    if (price > 0 && (best == null || net > best.net)) best = results[results.length - 1];
  });
  $('#mkBody').innerHTML = results.map(x => `<tr data-mk="${x.r.key}" class="${best && best.r.key === x.r.key ? 'best' : ''}">
    <td><b>${x.r.name}</b>${best && best.r.key === x.r.key ? '<span class="best-tag">최고</span>' : ''}<div class="help">${esc(x.r.note)}</div></td>
    <td class="r"><input type="text" inputmode="decimal" data-mkr="${x.r.key}|g" value="${x.g}" aria-label="${x.r.name} 일반 수수료율">%</td>
    <td class="r"><input type="text" inputmode="decimal" data-mkr="${x.r.key}|ad" value="${x.ad}" aria-label="${x.r.name} 광고주문 수수료율">%</td>
    <td class="r">${price > 0 ? money(x.fee) : '-'}</td>
    <td class="r"><b class="${x.net < 0 ? 'neg' : 'pos'}">${price > 0 ? money(x.net) : '-'}</b></td>
    <td class="r">${price > 0 ? pct1(x.netRate) : '-'}</td>
    <td class="r ${x.rr && x.rr.no ? 'neg' : ''}">${price > 0 ? (x.rr && !x.rr.no ? Math.round(x.rr.min) + '%' : '광고 불가') : '-'}</td>
    <td class="r">${price > 0 && x.rr && !x.rr.no ? Math.round(x.rr.rec) + '%' : '-'}</td>
    <td class="r">${x.minPrice && x.minPrice > 0 ? '<b>' + won(Math.ceil(x.minPrice / 100) * 100) + '원</b>' : '-'}</td>
  </tr>`).join('');
  $('#mkNote').innerHTML = `스마트스토어 6.63%는 Npay 3.63% + 판매수수료 3% 기준입니다(영세 등급 4.95%, 블로그·스레드 마케팅 링크 유입 시 판매수수료 1%). 당근 3.6%는 당근페이 결제 수수료 기준입니다. 실제 정산서의 수수료율이 다르면 표에서 고치세요 — 고친 값은 이 브라우저에 저장됩니다.`;
}
['mkCost', 'mkPrice', 'mkTarget'].forEach(id => {
  $('#' + id).addEventListener('input', e => {
    const key = id === 'mkCost' ? 'cost' : id === 'mkPrice' ? 'price' : 'target';
    if (key !== 'target') { const v = e.target.value.trim(); e.target.value = v === '' ? '' : won(toNum(v)); }
    S.mk[key] = e.target.value; store.set('mk-v1', S.mk);
    renderMarkets();
  });
});
$('#mkBody').addEventListener('change', e => {
  const inp = e.target.closest('input[data-mkr]');
  if (!inp) return;
  const [k, f] = inp.dataset.mkr.split('|');
  S.mkRates[k][f] = toNum(inp.value);
  store.set('mkRates-v1', S.mkRates);
  renderMarkets();
});

/* ══════════════════ 금지어 검사 ══════════════════ */
const BAN_GROUPS = [
  {
    cat: '질병·의약 표현', why: '식품에 질병 예방·치료 효능을 쓰면 표시광고법 위반입니다.',
    words: ['효능', '효과', '약효', '치료', '예방', '완화', '개선', '면역', '항암', '혈압', '혈당', '당뇨', '변비', '숙취', '해독', '디톡스', '피부 미용', '노화', '질병', '질환', '건강에 좋', '몸에 좋'],
    alts: { '효능': '맛·식감', '효과': '만족도', '치료': '', '예방': '', '개선': '정돈', '면역': '', '혈당': '', '변비': '', '해독': '깨끗한 세척', '디톡스': '', '건강에 좋': '든든한 한 끼', '몸에 좋': '부담 없는 간식' }
  },
  {
    cat: '다이어트·체중', why: '식품에 체중 감량 효과를 표시할 수 없습니다.',
    words: ['다이어트', '살 빠', '체중'], alts: { '다이어트': '가벼운 식사', '체중': '' }
  },
  {
    cat: '최상급·서열', why: '최고·최상·1위는 객관적 근거가 있어야 쓸 수 있습니다.',
    words: ['최고', '최상', '최강', '최초', '1등', '1위', '일등', '유일', 'No.1', '넘버 1'],
    alts: { '최고': '엄선한', '최상': '상품', '최강': '든든한', '최초': '', '1등': '판매 상위', '1위': '판매 상위', '일등': '판매 상위', '유일': '단일 품종' }
  },
  {
    cat: '절대·보장', why: '100%·보장·완벽은 실제로 지킬 수 없는 약속이 됩니다.',
    words: ['가장', '완벽', '100%', '무조건', '보장', '누구나'],
    alts: { '가장': '무난한', '완벽': '정돈된', '100%': '전량', '무조건': '', '보장': '환불 규정 안내', '누구나': '온 가족이' }
  },
  {
    cat: '영양 과장', why: '영양 성분 강조는 실제 성분 함량 근거가 필요합니다.',
    words: ['영양 만점'], alts: { '영양 만점': '고소한 맛' }
  }
];
const CERT_RE = /GAP|무농약|유기농|친환경|저탄소/g;
function banScan(text) {
  const src = String(text || '');
  const hits = [];
  BAN_GROUPS.forEach(g => {
    g.words.forEach(w => {
      let idx = 0, lower = src.toLowerCase(), ww = w.toLowerCase();
      while ((idx = lower.indexOf(ww, idx)) !== -1) {
        const before = src.slice(Math.max(0, idx - 10), idx);
        const after = src.slice(idx + w.length, idx + w.length + 10);
        hits.push({ word: src.slice(idx, idx + w.length), std: w, cat: g.cat, why: g.why, alt: g.alts[w] || '', ctx: `…${before}[${src.slice(idx, idx + w.length)}]${after}…` });
        idx += w.length;
        if (hits.length > 200) return;
      }
    });
  });
  const certs = [...new Set(src.match(CERT_RE) || [])];
  return { hits, certs };
}
function banHTML(text) {
  const { hits, certs } = banScan(text);
  if (!text.trim()) return '<p class="help">문구를 넣으면 여기에 결과가 나옵니다.</p>';
  let html = '';
  if (!hits.length) html += '<p class="badge ok" style="margin:0 0 12px">문제 표현 없음</p>';
  else {
    const byCat = {};
    hits.forEach(h => { (byCat[h.cat] = byCat[h.cat] || []).push(h); });
    html += '<p class="badge bad" style="margin:0 0 12px">' + hits.length + '곳 수정 필요</p>';
    Object.keys(byCat).forEach(cat => {
      html += `<div class="ban-group"><h3>${esc(cat)}</h3>` + byCat[cat].map(h => `
        <div class="ban-item"><span class="w">${esc(h.word)}</span><span class="why">${esc(h.why)}<br><span class="help">${esc(h.ctx)}</span></span>
        ${h.alt ? `<button type="button" class="alt" data-alt="${esc(h.alt)}">대체: ${esc(h.alt)}</button>` : ''}</div>`).join('') + '</div>';
    });
  }
  if (certs.length) html += `<div class="ban-group"><h3>인증 표현 확인</h3><div class="ban-item"><span class="w" style="font-weight:600">${certs.map(esc).join(' · ')}</span><span class="why">인증서를 갖춘 상품에만 쓰고, 인증번호·기관을 함께 표시하세요. 근거가 없으면 삭제하세요.</span></div></div>`;
  return html;
}
function banPaint() {
  const v = $('#banIn').value;
  const { hits, certs } = banScan(v);
  $('#banMeter').innerHTML = v.trim()
    ? (hits.length ? `<span class="badge bad">수정 필요 ${hits.length}곳</span>` : '<span class="badge ok">문제 표현 없음</span>')
    + `<span class="help">${v.length}자${certs.length ? ' · 인증 표현 ' + certs.length + '개 확인' : ''}</span>`
    : '<span class="help">문구를 붙여 넣으면 바로 검사합니다.</span>';
  $('#banOut').innerHTML = banHTML(v);
}
$('#banIn').addEventListener('input', banPaint);
$('#banOut').addEventListener('click', e => {
  const b = e.target.closest('[data-alt]');
  if (b) copyText(b.dataset.alt, `"${b.dataset.alt}" 복사했습니다`);
});
$('#banSample').addEventListener('click', () => {
  $('#banIn').value = '26년산 엔비사과 5kg 못난이 가정용 산지직송\n아삭한 식감이 오래가는 사과, 100% 국내산\n다이어트에 좋고 혈당 개선에 도움을 주는 최고의 사과를 보장합니다.';
  banPaint();
});

/* ══════════════════ 등록 도우미 ══════════════════ */
const MARKETS_MAKER = {
  coupang: { name: '쿠팡', limit: 100, tagHint: '쿠팡은 상품명 100자 이내, 특수문자·중복 키워드 반복은 노출에 불리합니다.' },
  smartstore: { name: '스마트스토어', limit: 50, tagHint: '네이버는 상품명 50자 권장(최대 100자)이고, 태그는 10개까지 붙습니다.' },
  toss: { name: '토스쇼핑', limit: 50, tagHint: '토스는 짧은 상품명이 잘 보입니다. 50자 이내로 핵심만.' },
  danggeun: { name: '당근', limit: 40, tagHint: '당근은 동네 이웃에게 보이므로 산지·중량·가격이 먼저입니다.' }
};
function cleanBanned(text, log) {
  let out = String(text || '');
  BAN_GROUPS.forEach(g => g.words.forEach(w => {
    if (!w) return;
    const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(out)) { log.push(w); out = out.replace(re, g.alts[w] || ''); }
  }));
  return out.replace(/\s{2,}/g, ' ').trim();
}
function makerInputs() {
  return {
    item: $('#fItem').value.trim(), variety: $('#fVariety').value.trim(), weight: $('#fWeight').value.trim(),
    grade: $('#fGrade').value.trim(), origin: $('#fOrigin').value.trim(), farm: $('#fFarm').value.trim(),
    price: $('#fPrice').value.trim(), ship: $('#fShip').value.trim(),
    p1: $('#fPoint1').value.trim(), p2: $('#fPoint2').value.trim(),
    market: $('#fMarket').value, state: $('#fState').value
  };
}
function buildName(f) {
  const v = f.variety || f.item;
  const parts = [v, f.weight, f.grade, f.item !== v ? f.item : '', f.p1, f.origin ? f.origin.split(' ')[0] + '산지' : ''];
  const uniq = [];
  parts.filter(Boolean).forEach(p => { if (!uniq.includes(p)) uniq.push(p); });
  return uniq.join(' ');
}
function buildTags(f) {
  const base = [f.item, f.variety, f.weight, f.grade, f.origin, f.p1, f.p2, '산지직송', '제철과일', '가정용', '선물용', '소포장',
    (/무료/.test(f.ship) ? '무료배송' : ''), f.farm, f.item + '선물', f.variety + '선물'];
  const out = [];
  base.filter(Boolean).forEach(t => {
    const c = cleanBanned(String(t).replace(/\s+/g, ''), []);
    if (c && !out.includes(c) && c.length <= 12) out.push(c);
  });
  return out.slice(0, 20);
}
function gosiRows(f) {
  const fresh = f.state === 'fresh';
  return [
    ['품목 또는 명칭', [f.item, f.grade].filter(Boolean).join(' ')],
    ['용량(중량)', f.weight || '상품 상세페이지 참조'],
    ['생산자', f.farm || '상품 상세페이지 참조'],
    ['원산지', f.origin || '상품 상세페이지 참조'],
    ['제조연월일', fresh ? '수확 후 순차 출고(상품 상세페이지 참조)' : '상품 상세페이지 참조'],
    ['유통기한(소비기한)', fresh ? '수확일로부터 냉장 7~14일(품목에 따라 다름)' : '상품 상세페이지 참조'],
    ['보관방법', fresh ? '냉장 보관(0~5℃), 직사광선을 피하세요' : '상품 상세페이지 참조'],
    ['포장단위별 용량', f.weight || '상품 상세페이지 참조'],
    ['인증·신고', '해당 없음(인증 상품은 인증서·번호 표시)'],
    ['교환·반품', '수령 후 24시간 내 신선식품 파손·오배송 사진 접수 시 교환·환불'],
    ['소비자상담', '판매자 문의(채널 내 문의하기)']
  ];
}
function detailText(f) {
  const v = f.variety || f.item;
  const points = [f.p1, f.p2].filter(Boolean);
  const lines = [];
  lines.push(`[${buildName(f)}]`);
  lines.push('');
  lines.push(`${f.origin ? f.origin + '에서 ' : ''}${f.weight} ${v}, ${points.join(' · ') || '신선하게 보내드립니다'}.`);
  lines.push('');
  lines.push('· 품질 — ' + (f.grade ? `${f.grade} 상품으로 선별했습니다. ` : '') + '크기와 모양이 조금씩 다를 수 있습니다.');
  lines.push('· 맛 — ' + (f.p1 || '제철에 맞춰 수확한 신선한 과일입니다.'));
  lines.push('· 포장 — 완충재로 안전하게 포장해 보내드립니다.');
  lines.push('· 배송 — ' + (f.ship || '무료배송 · 산지직송'));
  lines.push('');
  lines.push('[이런 분께]');
  lines.push(`· ${f.item}를 합리적인 가격에 찾는 분`);
  lines.push('· 가정에서 매일 챙겨 드시는 분');
  lines.push('· 선물·답례품을 준비하는 분');
  lines.push('');
  lines.push('[보관 안내]');
  lines.push(f.state === 'fresh' ? '· 받은 뒤 냉장 보관하고, 드시기 전 흐르는 물에 가볍게 씻어 주세요.' : '· 직사광선을 피해 서늘한 곳에 보관하세요.');
  lines.push('· 신선식품은 출고 후 1~2일 안에 드시면 가장 좋습니다.');
  lines.push('');
  lines.push('[배송 안내]');
  lines.push(`· ${f.ship || '무료배송 · 산지직송'}`);
  lines.push('· 평일 오전 주문은 당일~다음 영업일 출고됩니다. 산지 사정에 따라 1~2일 늦어질 수 있습니다.');
  lines.push('');
  lines.push('[교환·환불]');
  lines.push('· 신선식품은 수령 후 24시간 내 파손·오배송 사진을 보내주시면 교환 또는 환불해 드립니다.');
  lines.push('· 단순 변심·보관 부주의로 인한 상품성 상실은 교환·환불이 어렵습니다.');
  return lines.join('\n');
}
function detailHTML(f) {
  const v = f.variety || f.item;
  const points = [f.p1, f.p2].filter(Boolean);
  const price = f.price ? money(toNum(f.price)) : '';
  return `<div style="width:780px;max-width:100%;margin:0 auto;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#1b1b18;background:#fff;line-height:1.75">
  <div style="padding:44px 40px 32px;border-bottom:1px solid #e6e6e1">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:.16em;color:#8b8a80">${esc(f.origin || '산지직송')} · ${esc(f.market === 'danggeun' ? '동네 직거래' : '산지직송')}</p>
    <h1 style="margin:0;font-size:30px;line-height:1.35;letter-spacing:-.02em">${esc(buildName(f))}</h1>
    <p style="margin:14px 0 0;font-size:15px;color:#55544d">${esc(points.join(' · ') || '제철에 맞춰 수확해 바로 보내드립니다')}</p>
    ${price ? `<p style="margin:18px 0 0;font-size:26px;font-weight:700">${esc(price)}</p>` : ''}
  </div>
  <div style="display:flex;gap:12px;padding:26px 40px;border-bottom:1px solid #e6e6e1">
    ${[f.weight, f.grade, f.origin].filter(Boolean).map(t => `<div style="flex:1;border:1px solid #e6e6e1;border-radius:8px;padding:12px 14px;font-size:13px;color:#55544d">${esc(t)}</div>`).join('')}
  </div>
  <div style="padding:34px 40px">
    <h2 style="margin:0 0 12px;font-size:19px">${esc(v)} ${esc(f.weight)}</h2>
    <p style="margin:0 0 18px;font-size:15px;color:#3a3a34">${esc(f.origin ? f.origin + '에서 ' : '')}${esc(f.weight)} ${esc(v)}입니다. ${esc(f.grade ? f.grade + ' 상품으로 선별했습니다.' : '')} 크기와 모양은 조금씩 다를 수 있습니다.</p>
    ${points.map((p, i) => `<div style="display:flex;gap:14px;padding:16px 0;border-top:1px solid #ecece7"><span style="font-size:13px;color:#8b8a80;min-width:26px">0${i + 1}</span><div><b style="font-size:15px">${esc(p)}</b><p style="margin:4px 0 0;font-size:14px;color:#55544d">${esc(i === 0 ? '수확한 날 바로 선별해 보내드립니다.' : '완충재로 안전하게 포장해 보내드립니다.')}</p></div></div>`).join('')}
  </div>
  <div style="padding:26px 40px 40px;background:#f7f7f4;font-size:13px;color:#55544d">
    <b style="color:#1b1b18;font-size:14px">배송·교환 안내</b>
    <p style="margin:8px 0 0">· ${esc(f.ship || '무료배송 · 산지직송')}<br>· 평일 오전 주문은 당일~다음 영업일 출고, 산지 사정에 따라 1~2일 늦어질 수 있습니다.<br>· 신선식품은 수령 후 24시간 내 파손·오배송 사진 접수 시 교환·환불해 드립니다.</p>
    <p style="margin:14px 0 0;color:#8b8a80">판매자: ${esc(f.farm || '상품 상세페이지 참조')} · 원산지: ${esc(f.origin || '상품 상세페이지 참조')}</p>
  </div>
</div>`;
}
function renderMaker() {
  const f = makerInputs();
  const mk = MARKETS_MAKER[f.market];
  const log = [];
  ['item', 'variety', 'weight', 'grade', 'origin', 'farm', 'p1', 'p2'].forEach(k => { f[k] = cleanBanned(f[k], log); });
  const name = buildName(f).slice(0, mk.limit);
  const tags = buildTags(f);
  const gosi = gosiRows(f);
  const text = detailText(f);
  const html = detailHTML(f);
  $('#fWarn').innerHTML = log.length ? `<span class="neg">금지 표현 제거: ${[...new Set(log)].map(esc).join(', ')}</span>` : `<span class="help">${mk.tagHint}</span>`;
  $('#fOutNote').textContent = `${mk.name} 기준 ${name.length}/${mk.limit}자`;

  $('#outName').innerHTML = `<h3>노출 상품명 <button type="button" class="btn ghost sm" data-copy="name">복사</button></h3>
    <div class="out-box" id="nameBox">${esc(name)}</div>`;
  $('#outTags').innerHTML = `<h3>검색 태그 ${tags.length}개 <button type="button" class="btn ghost sm" data-copy="tags">전체 복사</button></h3>
    <div class="tag-list">${tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>`;
  $('#outGosi').innerHTML = `<h3>고시정보 <button type="button" class="btn ghost sm" data-copy="gosi">표 복사</button></h3>
    <table class="gosi-tbl"><tbody>${gosi.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
  $('#outDetail').innerHTML = `<h3>상세 문구 <button type="button" class="btn ghost sm" data-copy="text">문구 복사</button><button type="button" class="btn ghost sm" data-copy="html">HTML 복사</button></h3>
    <div class="out-box">${esc(text)}</div>
    <details class="prev-wrap"><summary>상세페이지 미리보기 (780px)</summary><div class="prev-frame"><iframe id="fPrev" sandbox="" title="상세페이지 미리보기"></iframe></div></details>`;
  const fr = $('#fPrev');
  if (fr) fr.srcdoc = '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;background:#fff}</style></head><body>' + html + '</body></html>';
  window.__mk = { name, tags, gosi, text, html };
}
$('#fGo').addEventListener('click', renderMaker);
$('#view-maker').addEventListener('click', e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const m = window.__mk;
  if (!m) return;
  if (b.dataset.copy === 'name') copyText(m.name);
  else if (b.dataset.copy === 'tags') copyText(m.tags.join(', '));
  else if (b.dataset.copy === 'gosi') copyText(m.gosi.map(([k, v]) => `${k}: ${v}`).join('\n'));
  else if (b.dataset.copy === 'text') copyText(m.text);
  else if (b.dataset.copy === 'html') copyText(m.html, '상세페이지 HTML을 복사했습니다');
});

/* ══════════════════ 가이드 ══════════════════ */
const CHECKS = [
  ['금지어 검사 통과', '상품명·상세 문구에 질병 효능·최상급·100% 표현이 없는지 확인'],
  ['대표이미지', '500px 이상 · 10MB 이하 · JPG/PNG 1장'],
  ['상세페이지', '780px 폭 권장 · 10MB 이하 · 여러 장이면 순서대로'],
  ['옵션 중량 분리', '1·2·3·5kg처럼 중량별로 옵션을 나눠 단가 비교를 쉽게'],
  ['판매가·쿠폰', '쿠폰적용 최종가 기준 마진율이 15% 이상인지 계산기로 확인'],
  ['목표 소싱가', '경쟁 5곳 평균 × 0.7 이하인지 확인'],
  ['배송·출고', '출고지·반품지·택배사(CJ대한통운)·출고 소요일 설정'],
  ['배송비', '무료배송 여부, 초도·반품배송비 5,000원 확인'],
  ['부가세', '신선식품은 면세, 가공품은 과세인지 확인'],
  ['인증·신고', 'GAP·무농약·유기농은 인증서 보유 시에만 표시'],
  ['검색필터', '2~3개 선택(원산지·중량·보관 방식 등)'],
  ['고시정보', '품목·용량·생산자·원산지 입력, 나머지는 상세페이지 참조'],
  ['재고·쿠폰', '재고 9개 유지, 24시간 할인쿠폰 반복 여부'],
  ['체험단', '쿠팡 검색창 직접 유입 구매만 랭킹 가점 — 상품평 조작 금지']
];
function renderGuide() {
  const done = store.get('checks-v1', {});
  $('#checklist').innerHTML = CHECKS.map(([t, d], i) => `<li>
    <input type="checkbox" id="ck${i}" data-ck="${i}" ${done[i] ? 'checked' : ''}>
    <label class="c-body" for="ck${i}"><b>${esc(t)}</b><span>${esc(d)}</span></label>
  </li>`).join('');
  const n = Object.values(done).filter(Boolean).length;
  $('#ckDone').textContent = `${n} / ${CHECKS.length}`;
  /* 도매처 표 */
  $('#supBody').innerHTML = DATA.suppliers.map(s => `
    <tr><td><b>${esc(s.name)}</b></td><td>${esc(s.type || '-')}</td><td class="r">${s.items ? won(s.items) : '—'}</td>
    <td>${s.own ? '<span class="state" style="color:#1f6b3f;border-color:rgba(31,107,63,.4)">가입·승인</span>' : s.gum ? '<span class="state">공개 도매가</span>' : '<span class="state">미가입</span>'}${s.flag ? ' <span class="state" style="color:#a03a22">' + esc(s.flag) + '</span>' : ''}</td>
    <td class="r">${s.url ? `<a class="help" href="${esc(s.url)}" target="_blank" rel="noopener">바로가기</a>` : ''}</td></tr>`).join('');
  $('#supLine').textContent = `${DATA.suppliers.length}곳 중 가입·승인 ${DATA.suppliers.filter(s => s.own).length}곳 · 공개 도매가 ${DATA.suppliers.filter(s => s.gum).length}곳`;
  $('#srcList').innerHTML = `
    <li>도매 공급가: ${esc(DATA.source.fruit || '')} — 기준일 ${esc(DATA.as_of || '-')}, 동기화 ${esc(DATA.synced_at || '-')}</li>
    <li>제철 지수: ${esc(DATA.source.season || '')}</li>
    <li>공산품: ${esc(DATA.source.wholesale || '')} — ${(DATA.wholesale || []).length}건</li>
    <li>계산식: 셀스위치온 공개 화면의 마진 계산기·순수익 마진계산기·토스 마진/광고 ROAS 공식(수수료율·부가세·ROAS 1.5배)</li>
    <li>수집 시점 이후 도매 단가는 바뀔 수 있습니다. 발주 전 도매처 화면에서 다시 확인하세요.</li>`;
}
$('#checklist').addEventListener('change', e => {
  const c = e.target.closest('[data-ck]');
  if (!c) return;
  const done = store.get('checks-v1', {});
  done[c.dataset.ck] = c.checked;
  store.set('checks-v1', done);
  $('#ckDone').textContent = `${Object.values(done).filter(Boolean).length} / ${CHECKS.length}`;
});

/* ══════════════════ boot ══════════════════ */
async function boot() {
  try {
    const r = await fetch('data.json?v=20261127d');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    DATA = await r.json();
  } catch (e) {
    $('#metaLine').textContent = '도매 데이터를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.';
    $('#sRows').innerHTML = '<div class="empty">데이터를 불러오지 못했습니다. 새로고침해 주세요.</div>';
    return;
  }
  $('#metaLine').innerHTML = `도매처 <b>${DATA.suppliers.length}</b>곳 · 규격 <b>${won(DATA.specs.length)}</b>개 공급가 비교 · 공산품 <b>${won((DATA.wholesale || []).length)}</b>건 · 공급가 기준일 <b>${esc(DATA.as_of || '-')}</b>`;
  loadSheets();
  renderGroups(); renderSourcing();
  renderVendors(); renderGoods();
  renderCalc();
  renderMarkets();
  banPaint();
  renderMaker();
  renderGuide();
  const h = location.hash.replace('#', '');
  setTab(['sourcing', 'goods', 'calc', 'markets', 'ban', 'maker', 'guide'].includes(h) ? h : 'sourcing');
  /* 소싱에서 넘어올 때 보여줄 예시 (첫 방문에만) */
  if (!store.get('seeded-v1', false)) {
    store.set('seeded-v1', true);
  }
}
boot();
