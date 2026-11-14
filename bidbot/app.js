/* 동곤 조달비서 PRO — app.js
   데이터: window.BIDBOT_DATA (안산시 실측 DB). 가짜 수치 없음. */
(function () {
  "use strict";

  const D = window.BIDBOT_DATA;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- utils ---------------- */
  const fmt = (n) => (Number(n) || 0).toLocaleString("ko-KR");
  const eok = (n) => (Number(n) / 1e8).toFixed(1);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function store(key, val) {
    try {
      if (val === undefined) {
        const raw = localStorage.getItem(key);
        return raw == null ? undefined : JSON.parse(raw);
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* private mode */ }
    return val;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function csv(rows) {
    const cell = (v) => {
      const s = String(v == null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  const TODAY = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const todayStr = `${TODAY.getFullYear()}-${pad2(TODAY.getMonth() + 1)}-${pad2(TODAY.getDate())}`;
  const ddays = (iso) => {
    if (!iso) return null;
    const d = new Date(iso + "T23:59:59");
    return Math.round((d - TODAY) / 86400000);
  };

  /* ---------------- defaults ---------------- */
  const DEFAULT_KW = ["화장지", "핸드타올", "복사용지", "책상", "의자", "쓰레기봉투", "제설", "장갑"];
  const SYN = {
    "화장지": ["롤화장지", "두루마리", "키친타올"],
    "핸드타올": ["핸드타월", "종이타올", "페이퍼타올"],
    "복사용지": ["A4용지", "복사지", "컬러용지"],
    "책상": ["테이블", "데스크", "책상용"],
    "의자": ["체어", "회의용의자", "학생용의자"],
    "쓰레기봉투": ["마대", "종량제봉투", "규격봉투"],
    "제설": ["제설제", "염화칼슘", "눈삽", "넉가래", "제빙", "미끄럼"],
    "장갑": ["방한장갑", "작업장갑", "안전장갑", "면장갑"],
    "핸드타월": ["핸드타올"],
  };
  const DEFAULT_COMPANY = {
    name: "늘봄상회",
    ceo: "김동곤",
    biz: "155-02-03811",
    open: "2026-04-14",
    addr: "경기도 안산시 상록구 성호로16길 13, 301호",
    tel: "010-9349-2844",
    mail: "",
  };

  const S = {
    view: "radar",
    keywords: store("bidbot.kw.v1") || DEFAULT_KW.slice(),
    synOn: store("bidbot.syn.v1") === undefined ? true : !!store("bidbot.syn.v1"),
    favs: store("bidbot.favs.v1") || [],
    company: Object.assign({}, DEFAULT_COMPANY, store("bidbot.company.v1") || {}),
    manual: store("bidbot.manual.v1") || { noSite: true, noLicense: true },
    doc: { type: "quote", qty: 1, unit: 0, vat: 1, days: 14 },
    rivals: { mode: "vendor", q: "", min: "", max: "", year: "all", favOnly: false, page: 1 },
    lastQuote: null,
  };

  /* ---------------- derived indexes ---------------- */
  const V = new Map();
  const DEPT = new Map();
  const YEARS = new Map();
  D.contracts.forEach((r) => {
    const [agency, dept, title, amount, date, vendor] = r;
    if (vendor) {
      let o = V.get(vendor);
      if (!o) { o = { name: vendor, count: 0, amount: 0, last: date, depts: {} }; V.set(vendor, o); }
      o.count++; o.amount += amount;
      if (date > o.last) o.last = date;
      o.depts[dept] = (o.depts[dept] || 0) + 1;
    }
    let d = DEPT.get(dept);
    if (!d) { d = { name: dept, count: 0, amount: 0 }; DEPT.set(dept, d); }
    d.count++; d.amount += amount;

    const y = date.slice(0, 4);
    const yy = YEARS.get(y) || { y, count: 0, amount: 0 };
    yy.count++; yy.amount += amount; YEARS.set(y, yy);
  });
  const VENDORS = Array.from(V.values());

  /* 게시판 실시간 + 수집 공고 + 지난 물품 공고를 한 목록으로 */
  const ACTIVE_ALL = (function () {
    const seen = {};
    const out = [];
    D.active.forEach((a) => { if (!seen[a.no]) { seen[a.no] = 1; out.push(a); } });
    D.recentGoods.forEach((a) => { if (!seen[a.no]) { seen[a.no] = 1; out.push(Object.assign({}, a, { past: true })); } });
    return out.sort((x, y) => (y.date + y.no).localeCompare(x.date + x.no));
  })();

  /* ---------------- keyword matching ---------------- */
  function expand(kw) {
    if (!S.synOn) return [kw];
    const list = SYN[kw];
    return list ? [kw].concat(list) : [kw];
  }
  let MATCH_TERMS = [];
  function rebuildTerms() {
    const set = new Set();
    S.keywords.forEach((k) => expand(k).forEach((t) => set.add(t.toLowerCase())));
    MATCH_TERMS = Array.from(set).sort((a, b) => b.length - a.length);
  }
  function hits(text) {
    if (!text) return false;
    const low = text.toLowerCase();
    for (let i = 0; i < MATCH_TERMS.length; i++) if (low.indexOf(MATCH_TERMS[i]) >= 0) return true;
    return false;
  }
  function highlight(text) {
    const safe = esc(text);
    if (!MATCH_TERMS.length) return safe;
    const lowSafe = safe.toLowerCase();
    const marks = [];
    MATCH_TERMS.forEach((t) => {
      let idx = 0;
      while ((idx = lowSafe.indexOf(t, idx)) !== -1) {
        marks.push([idx, idx + t.length]);
        idx += t.length;
      }
    });
    if (!marks.length) return safe;
    marks.sort((a, b) => a[0] - b[0]);
    const merged = [];
    marks.forEach((m) => {
      const last = merged[merged.length - 1];
      if (last && m[0] <= last[1]) last[1] = Math.max(last[1], m[1]);
      else merged.push([m[0], m[1]]);
    });
    let res = "";
    let cursor = 0;
    merged.forEach(([a, b]) => {
      res += safe.slice(cursor, a) + "<mark>" + safe.slice(a, b) + "</mark>";
      cursor = b;
    });
    return res + safe.slice(cursor);
  }

  /* ---------------- nav ---------------- */
  function setView(v) {
    S.view = v;
    $$(".view").forEach((el) => el.classList.toggle("active", el.id === "view-" + v));
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
    $("#sidebar").classList.remove("open");
    $("#scrim").classList.remove("open");
    window.scrollTo(0, 0);
    if (v === "trend") drawCharts();
  }

  /* ---------------- RADAR ---------------- */
  function renderKeywords() {
    const box = $("#kwList");
    if (!S.keywords.length) {
      box.innerHTML = '<span class="kw-empty">키워드가 없습니다. 아래에서 추가하세요.</span>';
    } else {
      box.innerHTML = S.keywords
        .map((k) => {
          const extra = S.synOn && SYN[k] ? `<i>+${SYN[k].length}</i>` : "";
          return `<span class="kw">${esc(k)}${extra}<button data-kwdel="${esc(k)}" aria-label="${esc(k)} 삭제">×</button></span>`;
        })
        .join("");
    }
    $("#synToggle").checked = S.synOn;
    const syn = S.keywords.filter((k) => SYN[k]);
    $("#synHint").innerHTML = S.synOn
      ? `동의어 확장 켜짐 — ${S.keywords.length}개 중 ${syn.length}개 키워드에 자동 확장어를 붙여 검색합니다 (예: 제설 → ${SYN["제설"].slice(0, 4).join(", ")}).`
      : "동의어 확장 꺼짐 — 입력한 글자 그대로만 찾습니다.";
    $("#watchMsg").textContent = watchMessage();
  }

  function plannedMatches() {
    return D.planned.filter((p) => hits(p.title + " " + (p.scale || "")));
  }
  function activeMatches() {
    return ACTIVE_ALL.filter((a) => hits(a.title + " " + (a.desc || "")));
  }
  function contractMatches() {
    return D.contracts.filter((c) => hits(c[2]));
  }

  function kpiSet(target, items) {
    target.innerHTML = items
      .map((i) => `<div class="kpi ${i.cls || ""}"><span>${esc(i.label)}</span><b>${i.value}${i.unit ? `<em>${esc(i.unit)}</em>` : ""}</b></div>`)
      .join("");
  }

  function renderRadar() {
    rebuildTerms();
    const pl = plannedMatches();
    const ac = activeMatches();
    const ct = contractMatches();
    const plGoods = pl.filter((p) => p.goods);
    const under20 = pl.filter((p) => p.goods && p.amount > 0 && p.amount <= 20000000);
    const amt = pl.reduce((s, p) => s + p.amount, 0);

    $("#badgeRadar").textContent = pl.length + ac.length;
    $("#badgeRadar").dataset.zero = pl.length + ac.length ? "0" : "1";

    kpiSet($("#radarKpi"), [
      { label: "감시 키워드", value: S.keywords.length, unit: "개", cls: "hl" },
      { label: "발주예정 매칭", value: pl.length, unit: "건" },
      { label: "그중 물품·2천만↓", value: under20.length, unit: "건", cls: "hl" },
      { label: "공고·물품 매칭", value: ac.length, unit: "건" },
      { label: "과거 3년 유사", value: ct.length, unit: "건", cls: "warn" },
      { label: "예정 금액 합계", value: eok(amt), unit: "억 원" },
    ]);

    /* ---- 발주예정 ---- */
    $("#cntPlanned").textContent = pl.length + "건";
    const boxP = $("#listPlanned");
    if (!pl.length) {
      boxP.innerHTML = emptyBox(
        "발주예정에 걸리는 건이 없습니다",
        "지금 등록된 키워드로는 안산시 발주계획(144건)에 해당 품목이 없습니다. 다음 달 계획에 다시 나타날 수 있으니 키워드를 넓혀 두세요.",
        ["제설", "화장지", "도서", "인쇄", "가구"]
      );
    } else {
      boxP.innerHTML = pl.slice(0, 40).map((p) => plannedCard(p)).join("");
      if (pl.length > 40) boxP.insertAdjacentHTML("beforeend", `<div class="empty">표시 40건 / 전체 ${pl.length}건 — 키워드를 좁히면 더 정확해집니다.</div>`);
    }

    /* ---- 최근 공고 ---- */
    const liveOpen = ac.filter((a) => a.deadline && ddays(a.deadline) >= 0).length;
    const liveThisMonth = D.active.filter((a) => a.date.slice(0, 7) === todayStr.slice(0, 7)).length;
    $("#cntActive").textContent = ac.length ? `${ac.length}건 · 접수 중 ${liveOpen}건` : "0건";
    const boxA = $("#listActive");
    if (!ac.length) {
      boxA.innerHTML = emptyBox(
        "최근 공고에 걸리는 물품 건이 없습니다",
        `수집된 안산시 공고 ${D.active.length}건과 지난 물품 공고 ${D.recentGoods.length}건 어디에도 등록 키워드가 걸리지 않았습니다. 발주예정 목록으로 준비하면서 키워드를 넓혀 두세요.`,
        ["제설", "화장지", "도서", "인쇄", "가구", "냉난방"]
      );
    } else {
      boxA.innerHTML = ac.slice(0, 30).map((a) => activeCard(a)).join("");
    }
    const liveGoods = D.active.filter((a) => a.kind === "물품").length;
    $("#boardNote").innerHTML =
      `게시판 확인 ${D.meta.liveChecked} · 전체 공고 ${fmt(D.meta.boardTotal)}건 중 이번 달(${todayStr.slice(0, 7)}) 신규 ${liveThisMonth}건, 물품 <b>${liveGoods}건</b>. ` +
      `지난 물품 공고 ${D.recentGoods.length}건은 마감 표시로 함께 보여 주며, 마감일은 공고문 본문에서 추출한 값입니다.`;

    /* ---- 과거 ---- */
    $("#cntPast").textContent = ct.length + "건";
    const tb = $("#pastTbl tbody");
    if (!ct.length) {
      tb.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--sub);padding:22px">과거 3년 계약 중 매칭된 품목이 없습니다.</td></tr>`;
    } else {
      tb.innerHTML = ct.slice(0, 12).map((c) => `
        <tr>
          <td class="sub">${esc(c[4])}</td>
          <td class="t">${highlight(c[2])}</td>
          <td class="sub">${esc(c[1])}</td>
          <td class="r num">${fmt(c[3])}</td>
          <td class="v">${esc(c[5])}</td>
        </tr>`).join("");
    }
    renderKeywords();
  }

  function emptyBox(title, desc, suggest) {
    const chips = (suggest || []).filter((s) => S.keywords.indexOf(s) === -1)
      .map((s) => `<button class="chip-btn" data-suggest="${esc(s)}">+ ${esc(s)}</button>`).join("");
    return `<div class="empty"><b>${esc(title)}</b>${esc(desc)}${chips ? `<div class="suggest">${chips}</div>` : ""}</div>`;
  }

  function plannedTags(p) {
    const t = [];
    if (p.month) t.push(`<span class="tag blue">${esc(p.month)}</span>`);
    if (p.method) t.push(`<span class="tag">${esc(p.method)}</span>`);
    if (p.cat) t.push(`<span class="tag">${esc(p.cat)}</span>`);
    if (p.amount > 0 && p.amount <= 20000000) t.push('<span class="tag ok">2천만 이하</span>');
    else if (p.amount > 20000000) t.push('<span class="tag warn">2천만 초과</span>');
    if (p.goods) t.push('<span class="tag ok">물품</span>');
    return t.join("");
  }

  function plannedCard(p) {
    const q = esc(p.title.slice(0, 30));
    return `<article class="bid">
      <div class="bid-top">
        <div class="bid-title">${highlight(p.title)}</div>
        <div class="bid-amt">${fmt(p.amount)}<small>원</small></div>
      </div>
      <div class="bid-meta">${plannedTags(p)}</div>
      <div class="bid-sub">
        ${p.scale ? `<b>규격</b> ${esc(p.scale)} · ` : ""}<b>부서</b> ${esc(p.dept)}
        ${p.officer ? ` · <b>담당</b> ${esc(p.officer)}` : ""}${p.phone ? ` <a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ""}
      </div>
      <div class="bid-actions">
        <button class="btn primary" data-calc="${p.amount || 0}">투찰가 계산</button>
        <button class="btn ghost" data-supplier="${q}">도매가 검색</button>
        <button class="btn ghost" data-past="${q}">낙찰 이력</button>
      </div>
    </article>`;
  }

  function activeCard(a) {
    const dd = ddays(a.deadline);
    let badge = '<span class="tag">마감일 미기재</span>';
    if (a.deadline) {
      if (dd < 0) badge = `<span class="tag bad">마감 ${esc(a.deadline)}</span>`;
      else if (dd === 0) badge = `<span class="tag warn">오늘 마감</span>`;
      else badge = `<span class="tag ok">D-${dd}</span>`;
    }
    const kindCls = a.kind === "물품" ? "ok" : "warn";
    const url = a.url || "https://ansan.go.kr/www/common/bbs/selectPageListBbs.do?bbs_code=WWW15";
    return `<article class="bid">
      <div class="bid-top">
        <div class="bid-title">${highlight(a.title)}</div>
        ${badge}
      </div>
      <div class="bid-meta">
        <span class="tag ${kindCls}">${esc(a.kind)}</span>
        ${a.cat ? `<span class="tag">${esc(a.cat)}</span>` : ""}
        ${a.past ? '<span class="tag">지난 공고</span>' : ""}
        <span class="tag">${esc(a.dept)}</span>
      </div>
      <div class="bid-sub"><b>공고일</b> ${esc(a.date)}${a.gosi ? ` · ${esc(a.gosi)}` : ""}${a.no ? ` · No.${esc(a.no)}` : ""}</div>
      <div class="bid-actions">
        <a class="btn primary" href="${esc(url)}" target="_blank" rel="noopener">공고문 원문 ↗</a>
        <button class="btn ghost" data-supplier="${esc(a.title.slice(0, 30))}">도매가 검색</button>
      </div>
    </article>`;
  }

  /* ---------------- supplier modal ---------------- */
  function supplierModal(q) {
    const enc = encodeURIComponent(q);
    const items = [
      { name: "네이버 B2B 최저가", spec: "업소용·관공서 납품 단가 대조", link: `https://msearch.shopping.naver.com/search/all?query=${enc}` },
      { name: "오너클랜 B2B 위탁배송", spec: "도매 위탁·직발송 재고 확인", link: `https://m.ownerclan.com/V2/product/search.php?keyword=${enc}` },
      { name: "도매매 (도매꾹 B2B)", spec: "사업자 도매 단가", link: `https://m.domeme.domeggook.com/index/item/itemSearch.php?skey=${enc}` },
      { name: "쿠팡 비즈니스", spec: "대용량 로켓배송 빠른 납기", link: `https://m.coupang.com/nm/search?q=${enc}` },
      { name: "도매꾹 (모바일)", spec: "모바일 전용 바로가기", link: `https://mobile.domeggook.com/itemlist?so=rd&pg=1&kw=${enc}&kwType=title` },
    ];
    openModal(
      `도매가 대조 — "${q}"`,
      `<div class="supp">${items.map((i) => `
        <div class="supp-item">
          <div>
            <h4>${esc(i.name)}</h4>
            <p>${esc(i.spec)}</p>
          </div>
          <a class="btn ghost sm" href="${esc(i.link)}" target="_blank" rel="noopener">열기 ↗</a>
        </div>`).join("")}
        <p class="hint">투찰 전 이 5곳에서 실제 재고와 단가를 확인하고, 배송비까지 넣어 역마진을 막습니다. 견적 단가는 최저가가 아니라 <b>납기 안에 도착하는 단가</b>로 잡으세요.</p>
      </div>`
    );
  }

  /* ---------------- PREDICT ---------------- */
  function pNum(id) { return parseFloat(($(id) || {}).value) || 0; }

  function computePredict() {
    const base = pNum("#pBase");
    const est = pNum("#pEstimate");
    const floorPct = parseFloat($("#pFloor").value) || 87.745;
    const range = parseFloat($("#pRange").value) || 0;
    const cost = pNum("#pCost");
    const ship = pNum("#pShip");
    const feePct = pNum("#pFee");

    const floor0 = Math.round((base * floorPct) / 100);
    const rec = Math.round(floor0 * 1.002);
    const fee = Math.round((rec * feePct) / 100);
    const profit = rec - cost - ship - fee;
    const margin = rec > 0 ? (profit / rec) * 100 : 0;
    const rate = base > 0 ? (rec / base) * 100 : 0;
    const baseAmt = est > 0 ? est : base;

    return { base, est, floorPct, range, cost, ship, feePct, floor0, rec, fee, profit, margin, rate, baseAmt };
  }

  function renderPredict() {
    const r = computePredict();
    $("#rFloor").textContent = fmt(r.floor0) + "원";
    $("#rRec").textContent = fmt(r.rec) + "원";
    $("#rCost").textContent = fmt(r.cost + r.ship) + "원";
    $("#rFee").textContent = fmt(r.fee) + "원";
    $("#rProfit").textContent = (r.profit >= 0 ? "+" : "") + fmt(r.profit) + "원";
    $("#rProfit").style.color = r.profit >= 0 ? "var(--ok)" : "var(--bad)";
    $("#rMargin").textContent = r.margin.toFixed(1) + "%";
    $("#rMargin").style.color = r.margin >= 15 ? "var(--ok)" : r.margin >= 8 ? "var(--warn)" : "var(--bad)";
    $("#rRate").textContent = r.rate.toFixed(3) + "%";

    /* scenario */
    const rates = r.range === 0 ? [0] : [];
    if (r.range > 0) for (let i = -r.range; i <= r.range; i++) rates.push(i);
    const tb = $("#scenarioTbl tbody");
    tb.innerHTML = rates.map((rt) => {
      const floor = Math.round((r.base * (1 + rt / 100) * r.floorPct) / 100);
      const fee = Math.round((floor * r.feePct) / 100);
      const p = floor - r.cost - r.ship - fee;
      const m = floor > 0 ? (p / floor) * 100 : 0;
      const verdict = p <= 0 ? '<span class="tag bad">역마진</span>' : m >= 15 ? '<span class="tag ok">양호</span>' : m >= 8 ? '<span class="tag warn">주의</span>' : '<span class="tag warn">박함</span>';
      const isZero = rt === 0 ? " style=\"background:var(--blue-050)\"" : "";
      return `<tr${isZero}><td class="t">${rt > 0 ? "+" : ""}${rt}%</td><td class="r num">${fmt(floor)}</td>
        <td class="r num" style="color:${p >= 0 ? "var(--ok)" : "var(--bad)"}">${p >= 0 ? "+" : ""}${fmt(p)}</td>
        <td class="r num">${m.toFixed(1)}%</td><td>${verdict}</td></tr>`;
    }).join("");

    /* fit */
    const shipRatio = r.rec > 0 ? (r.ship / r.rec) * 100 : 0;
    const items = [];
    items.push(r.baseAmt <= 20000000
      ? { k: "ok", t: `금액 ${fmt(Math.round(r.baseAmt))}원 — 소액수의 2,000만 원 이하 (1인 수의 참여 가능)` }
      : { k: "bad", t: `금액 ${fmt(Math.round(r.baseAmt))}원 — 2,000만 원 초과. 적격심사·실적 경쟁 구간이라 1인 사업자는 사실상 탈락입니다` });
    items.push(r.profit > 0
      ? { k: "ok", t: `순이익 ${fmt(r.profit)}원 흑자 (채권·보증 ${r.feePct}% 반영)` }
      : { k: "bad", t: `순이익 ${fmt(r.profit)}원 — 이 단가로는 낼수록 손해입니다. 도매처를 다시 찾으세요` });
    items.push(r.margin >= 15
      ? { k: "ok", t: `마진율 ${r.margin.toFixed(1)}% — 배송 지연·검수 반품을 감당할 여유가 있습니다` }
      : r.margin >= 8
        ? { k: "warn", t: `마진율 ${r.margin.toFixed(1)}% — 소액이라도 반품 1건이면 사라지는 폭입니다` }
        : { k: "bad", t: `마진율 ${r.margin.toFixed(1)}% — 배송비만 조금 올라도 역마진입니다` });
    items.push(shipRatio <= 10
      ? { k: "ok", t: `배송비 비중 ${shipRatio.toFixed(1)}% — 납품 방식이 단가에 무리 없습니다` }
      : { k: "warn", t: `배송비 비중 ${shipRatio.toFixed(1)}% — 1톤 용달·하차비가 큰 품목입니다. 수량을 키우거나 직납으로 바꾸세요` });
    items.push(S.manual.noSite
      ? { k: "ok", t: "현장 설치·시공 없음 (물품 납품만)" }
      : { k: "bad", t: "현장 설치·시공 있음 — 건설면허 영역이라 참여 대상이 아닙니다" });
    items.push(S.manual.noLicense
      ? { k: "ok", t: "특수 면허 불필요 (도소매·전자상거래 등록으로 참여)" }
      : { k: "bad", t: "특수 면허 필요 품목 — 공급물품 코드 등록 전 확인이 필요합니다" });

    $("#fitList").innerHTML = items.map((i) => `
      <li><span class="fi ${i.k}">${i.k === "ok" ? "✓" : i.k === "bad" ? "!" : "·"}</span><span>${esc(i.t)}</span></li>`).join("") + `
      <li style="border-top:1px dashed var(--line);padding-top:10px;margin-top:2px">
        <label class="switch sm"><input type="checkbox" id="mNoSite" ${S.manual.noSite ? "checked" : ""}><span></span><em>현장 설치·시공 없음</em></label>
        <label class="switch sm" style="margin-left:14px"><input type="checkbox" id="mNoLic" ${S.manual.noLicense ? "checked" : ""}><span></span><em>특수 면허 불필요</em></label>
      </li>`;

    const bad = items.some((i) => i.k === "bad");
    const warn = items.some((i) => i.k === "warn");
    const fit = $("#rFit");
    fit.className = "fit-badge " + (bad ? "bad" : warn ? "warn" : "ok");
    fit.textContent = bad ? "부적합 — 조건 재검토" : warn ? "주의 — 여유 부족" : "적합 — 투찰 가능";

    $("#mNoSite").addEventListener("change", (e) => { S.manual.noSite = e.target.checked; store("bidbot.manual.v1", S.manual); renderPredict(); });
    $("#mNoLic").addEventListener("change", (e) => { S.manual.noLicense = e.target.checked; store("bidbot.manual.v1", S.manual); renderPredict(); });
    S.predict = r;
  }

  const PRESETS = {
    1: { base: 12000000, cost: 5400000, ship: 150000, fee: 1.5, est: "" },
    2: { base: 10000000, cost: 4800000, ship: 120000, fee: 1.5, est: "" },
    3: { base: 20000000, cost: 11500000, ship: 250000, fee: 1.5, est: "" },
    4: { base: 6000000, cost: 3600000, ship: 50000, fee: 1.5, est: "" },
  };

  /* ---------------- RIVALS ---------------- */
  function filteredContracts() {
    const q = S.rivals.q.trim().toLowerCase();
    const min = parseFloat(S.rivals.min) || 0;
    const max = parseFloat(S.rivals.max) || 0;
    const yr = S.rivals.year;
    const favSet = new Set(S.favs);
    return D.contracts.filter((c) => {
      if (yr !== "all" && c[4].slice(0, 4) !== yr) return false;
      if (min && c[3] < min) return false;
      if (max && c[3] > max) return false;
      if (S.rivals.favOnly && !favSet.has(c[5])) return false;
      if (q) {
        const hay = (c[2] + " " + c[1] + " " + c[5] + " " + c[0]).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderRivals() {
    const list = filteredContracts();
    const body = $("#rvBody");

    if (S.rivals.mode === "contract") {
      const per = 20;
      const pages = Math.max(1, Math.ceil(list.length / per));
      S.rivals.page = clamp(S.rivals.page, 1, pages);
      const slice = list.slice((S.rivals.page - 1) * per, S.rivals.page * per);
      body.innerHTML = `
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>계약일</th><th>품목(계약명)</th><th>부서</th><th class="r">계약금액</th><th>업체</th></tr></thead>
            <tbody>${slice.length ? slice.map((c) => `
              <tr>
                <td class="sub">${esc(c[4])}</td>
                <td class="t">${highlight(c[2])}</td>
                <td class="sub">${esc(c[1])}</td>
                <td class="r num">${fmt(c[3])}</td>
                <td class="v"><button class="linkbtn" data-vendor="${esc(c[5])}">${esc(c[5])}</button></td>
              </tr>`).join("") : `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--sub)">조건에 맞는 계약이 없습니다.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="pager">
          <button data-page="1" ${S.rivals.page === 1 ? "disabled" : ""}>«</button>
          <button data-page="${S.rivals.page - 1}" ${S.rivals.page === 1 ? "disabled" : ""}>‹</button>
          <button class="on">${S.rivals.page} / ${pages}</button>
          <button data-page="${S.rivals.page + 1}" ${S.rivals.page === pages ? "disabled" : ""}>›</button>
          <button data-page="${pages}" ${S.rivals.page === pages ? "disabled" : ""}>»</button>
        </div>
        <p class="hint">전체 ${fmt(list.length)}건 · 페이지당 20건</p>`;
      return;
    }

    /* vendor ranking */
    const q = S.rivals.q.trim().toLowerCase();
    const favSet = new Set(S.favs);
    let rows = VENDORS.filter((v) => {
      if (S.rivals.favOnly && !favSet.has(v.name)) return false;
      if (q && v.name.toLowerCase().indexOf(q) === -1 && !Object.keys(v.depts).some((d) => d.toLowerCase().indexOf(q) >= 0)) return false;
      return true;
    });
    if (S.rivals.min || S.rivals.max || S.rivals.year !== "all") {
      const allowed = new Set(list.filter((c) => c[5]).map((c) => c[5]));
      rows = rows.filter((v) => allowed.has(v.name));
    }
    rows = rows.sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((s, v) => s + v.amount, 0) || 1;
    const per = 20;
    const pages = Math.max(1, Math.ceil(rows.length / per));
    S.rivals.page = clamp(S.rivals.page, 1, pages);
    const slice = rows.slice((S.rivals.page - 1) * per, S.rivals.page * per);

    body.innerHTML = `
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>#</th><th>업체</th><th class="r">건수</th><th class="r">낙찰 총액</th><th class="r">평균</th><th class="r">점유율</th><th>최근</th><th>관심</th></tr></thead>
          <tbody>${slice.length ? slice.map((v, i) => {
            const rank = (S.rivals.page - 1) * per + i + 1;
            const on = favSet.has(v.name);
            return `<tr>
              <td class="sub">${rank}</td>
              <td class="v"><button class="linkbtn" data-vendor="${esc(v.name)}">${esc(v.name)}</button></td>
              <td class="r num">${v.count}</td>
              <td class="r num">${fmt(v.amount)}</td>
              <td class="r num">${fmt(Math.round(v.amount / v.count))}</td>
              <td class="r num">${((v.amount / total) * 100).toFixed(2)}%</td>
              <td class="sub">${esc(v.last)}</td>
              <td><button class="fav-btn ${on ? "on" : ""}" data-fav="${esc(v.name)}" aria-label="관심 경쟁사">${on ? "★" : "☆"}</button></td>
            </tr>`;
          }).join("") : `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--sub)">조건에 맞는 업체가 없습니다.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <button data-page="1" ${S.rivals.page === 1 ? "disabled" : ""}>«</button>
        <button data-page="${S.rivals.page - 1}" ${S.rivals.page === 1 ? "disabled" : ""}>‹</button>
        <button class="on">${S.rivals.page} / ${pages}</button>
        <button data-page="${S.rivals.page + 1}" ${S.rivals.page === pages ? "disabled" : ""}>›</button>
        <button data-page="${pages}" ${S.rivals.page === pages ? "disabled" : ""}>»</button>
      </div>
      <p class="hint">업체 ${fmt(rows.length)}곳 · 전체 계약 ${fmt(list.length)}건 · 점유율은 위 목록 합계 대비 비중입니다.</p>`;
    renderFavs();
  }

  function renderFavs() {
    const box = $("#favList");
    $("#badgeFav").textContent = S.favs.length;
    $("#badgeFav").dataset.zero = S.favs.length ? "0" : "1";
    if (!S.favs.length) {
      box.innerHTML = '<span class="muted small">아직 저장한 업체가 없습니다. 랭킹에서 ☆ 를 누르면 여기에 고정됩니다.</span>';
      return;
    }
    box.innerHTML = S.favs.map((n) => {
      const v = V.get(n);
      return `<span class="fav-chip"><b>${esc(n)}</b>${v ? `<span>${v.count}건 · ${eok(v.amount)}억</span>` : ""}<button data-fav="${esc(n)}" aria-label="해제">×</button></span>`;
    }).join("");
  }

  function vendorModal(name) {
    const v = V.get(name);
    if (!v) return;
    const mine = D.contracts.filter((c) => c[5] === name);
    const depts = Object.entries(v.depts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const titles = mine.slice().sort((a, b) => b[3] - a[3]).slice(0, 6);
    const on = S.favs.indexOf(name) >= 0;
    openModal(`${name}`, `
      <div class="res-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
        <div><span class="muted">낙찰 건수</span><b>${v.count}건</b></div>
        <div><span class="muted">낙찰 총액</span><b>${eok(v.amount)}억</b></div>
        <div><span class="muted">평균 단가</span><b>${fmt(Math.round(v.amount / v.count))}원</b></div>
      </div>
      <p class="muted small" style="margin-bottom:8px">주요 발주 부서</p>
      <p style="margin-bottom:14px">${depts.map((d) => `<span class="tag">${esc(d[0])} ${d[1]}건</span>`).join(" ")}</p>
      <p class="muted small" style="margin-bottom:6px">금액 상위 계약</p>
      <div class="tbl-wrap" style="margin-bottom:14px">
        <table class="tbl" style="min-width:0">
          <tbody>${titles.map((c) => `<tr><td class="sub">${esc(c[4])}</td><td class="t">${esc(c[2])}</td><td class="r num">${fmt(c[3])}</td></tr>`).join("")}</tbody>
        </table>
      </div>
      <div class="row-actions">
        <button class="btn ${on ? "ghost" : "primary"} sm" data-fav="${esc(name)}">${on ? "관심 경쟁사 해제" : "관심 경쟁사로 저장"}</button>
        <button class="btn ghost sm" data-vendorlist="${esc(name)}">계약 이력 전체 보기</button>
      </div>
      <p class="hint">원천 DB에는 계약금액만 있고 사정률·투찰금액은 없습니다. 이 업체의 투찰 성향은 공고별로 원문을 열어 확인해야 합니다.</p>
    `);
  }

  /* ---------------- TREND ---------------- */
  function svgVBar(data, opt) {
    const o = Object.assign({ w: 900, h: 250, t: 16, r: 12, b: 34, l: 38, line: true }, opt || {});
    const iw = o.w - o.l - o.r;
    const ih = o.h - o.t - o.b;
    const maxC = Math.max(1, ...data.map((d) => d.c));
    const maxA = Math.max(1, ...data.map((d) => d.a));
    const n = data.length;
    const bw = iw / n;
    const barW = Math.max(3, Math.min(26, bw * 0.62));
    let s = `<svg viewBox="0 0 ${o.w} ${o.h}" role="img">`;
    for (let g = 0; g <= 4; g++) {
      const y = o.t + (ih * g) / 4;
      const val = Math.round((maxC * (4 - g)) / 4);
      s += `<line class="grid-line" x1="${o.l}" y1="${y}" x2="${o.w - o.r}" y2="${y}"/>`;
      s += `<text class="axis" x="${o.l - 6}" y="${y + 3}" text-anchor="end">${val}</text>`;
    }
    data.forEach((d, i) => {
      const x = o.l + i * bw + (bw - barW) / 2;
      const h = (d.c / maxC) * ih;
      const y = o.t + ih - h;
      const cls = "bar" + (d.hot ? " hot" : "");
      s += `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="3"><title>${esc(d.tip || d.label)}</title></rect>`;
    });
    if (o.line) {
      const pts = data.map((d, i) => {
        const cx = o.l + i * bw + bw / 2;
        const cy = o.t + ih - (d.a / maxA) * ih;
        return cx.toFixed(1) + "," + cy.toFixed(1);
      }).join(" ");
      s += `<polyline points="${pts}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;
      data.forEach((d, i) => {
        const cx = o.l + i * bw + bw / 2;
        const cy = o.t + ih - (d.a / maxA) * ih;
        if (n <= 14) s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.6" fill="#2563eb"/>`;
      });
      s += `<text class="axis" x="${o.w - o.r}" y="${o.t - 4}" text-anchor="end">최고 ${eok(maxA)}억</text>`;
    }
    const every = Math.ceil(n / (o.labels || 13));
    data.forEach((d, i) => {
      if (i % every !== 0 && i !== n - 1) return;
      const x = o.l + i * bw + bw / 2;
      s += `<text class="axis" x="${x.toFixed(1)}" y="${o.h - 12}" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return s + "</svg>";
  }

  function domBars(items, opt) {
    const o = Object.assign({ fmtVal: (v) => fmt(v) }, opt || {});
    const max = Math.max(1, ...items.map((i) => i.v));
    return `<div class="hb">${items.map((i) => `
      <div class="hb-row">
        <span class="hb-label" title="${esc(i.label)}">${esc(i.label)}</span>
        <span class="hb-track"><span class="hb-fill" style="width:${((i.v / max) * 100).toFixed(1)}%${i.hot ? ";background:linear-gradient(90deg,#fbbf24,#f59e0b)" : ""}"></span></span>
        <span class="hb-val">${o.fmtVal(i.v)}</span>
      </div>`).join("")}</div>`;
  }

  let chartsDrawn = false;
  function drawCharts() {
    if (chartsDrawn) return;
    chartsDrawn = true;
    $("#chartMonthly").innerHTML = svgVBar(D.months.map((m) => ({
      label: m.ym.slice(2).replace("-", "."),
      c: m.count, a: m.amount,
      hot: m.ym.slice(5) === "11" || m.ym.slice(5) === "12",
      tip: `${m.ym} · ${m.count}건 · ${eok(m.amount)}억`,
    })), { labels: 13 });

    $("#chartMoy").innerHTML = svgVBar(D.moy.map((m) => ({
      label: m.m + "월", c: m.count, a: m.amount,
      hot: m.m >= 11,
      tip: `${m.m}월 합산 · ${m.count}건 · ${eok(m.amount)}억`,
    })), { w: 560, h: 210, labels: 12 });

    $("#chartCat").innerHTML = domBars(
      D.cats.slice(0, 8).map((c) => ({ label: c.name, v: c.count })),
      { fmtVal: (v) => v + "건" }
    );

    const depts = Array.from(DEPT.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    $("#chartDept").innerHTML = domBars(depts.map((d) => ({ label: d.name, v: d.count })), { fmtVal: (v) => v + "건" });

    const years = Array.from(YEARS.values()).sort((a, b) => a.y.localeCompare(b.y));
    $("#yearTbl tbody").innerHTML = years.map((y) => `
      <tr><td class="t">${esc(y.y)}년</td><td class="r num">${fmt(y.count)}</td>
      <td class="r num">${eok(y.amount)}억</td>
      <td class="r num">${fmt(Math.round(y.amount / y.count))}</td></tr>`).join("");
  }

  function renderTrend() {
    const totalCount = D.meta.contractCount;
    const totalAmt = D.meta.contractAmount;
    const nov = D.moy.find((m) => m.m === 11) || { count: 0, amount: 0 };
    const dec = D.moy.find((m) => m.m === 12) || { count: 0, amount: 0 };
    const yearEnd = nov.count + dec.count;
    const yearEndAmt = nov.amount + dec.amount;
    const share = ((yearEnd / totalCount) * 100).toFixed(1);
    const avgMonth = Math.round(totalCount / 37);

    kpiSet($("#trendKpi"), [
      { label: "수집 계약", value: fmt(totalCount), unit: "건", cls: "hl" },
      { label: "계약 총액", value: eok(totalAmt), unit: "억 원" },
      { label: "11월+12월", value: fmt(yearEnd), unit: "건", cls: "warn" },
      { label: "연말 집중도", value: share, unit: "%", cls: "warn" },
      { label: "연말 2개월 금액", value: eok(yearEndAmt), unit: "억 원" },
      { label: "월평균", value: fmt(avgMonth), unit: "건" },
    ]);
    drawCharts();
  }

  /* ---------------- DOCS ---------------- */
  function korAmt(num) {
    const n = Math.floor(Math.abs(Number(num) || 0));
    if (!n) return "영";
    const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    const units = ["", "십", "백", "천"];
    const groups = ["", "만", "억", "조"];
    const s = String(n);
    const parts = [];
    for (let i = s.length; i > 0; i -= 4) parts.unshift(s.slice(Math.max(0, i - 4), i));
    let out = "";
    parts.forEach((p, pi) => {
      const gi = parts.length - 1 - pi;
      let g = "";
      for (let k = 0; k < p.length; k++) {
        const d = +p[k];
        if (!d) continue;
        const unit = p.length - 1 - k;
        if (d === 1 && unit > 0) g += units[unit];
        else g += digits[d] + units[unit];
      }
      if (g) out += g + groups[gi];
    });
    return out;
  }

  function todayKr() {
    return `${TODAY.getFullYear()}년 ${TODAY.getMonth() + 1}월 ${TODAY.getDate()}일`;
  }

  function companyBlock() {
    const c = S.company;
    return `<div class="p-sign">
      ${todayKr()}<br>
      <span>${esc(c.addr)}</span><br>
      <span>상호: ${esc(c.name)} &nbsp; 대표자: ${esc(c.ceo)} <span class="p-stamp">(인)</span></span><br>
      <span>사업자등록번호: ${esc(c.biz)} &nbsp; 연락처: ${esc(c.tel)}</span>
      ${c.mail ? `<br><span>이메일: ${esc(c.mail)}</span>` : ""}
    </div>`;
  }

  function renderDoc() {
    const paper = $("#paper");
    const type = S.doc.type;
    $("#quoteFields").style.display = type === "quote" ? "grid" : "none";

    if (type === "quote") {
      const q = {
        title: $("#qTitle").value.trim(),
        org: $("#qOrg").value.trim() || "안산시청",
        item: $("#qItem").value.trim(),
        spec: $("#qSpec").value.trim(),
        qty: Math.max(0, parseInt($("#qQty").value, 10) || 0),
        unit: Math.max(0, parseInt($("#qUnit").value, 10) || 0),
        vat: $("#qVat").value === "1",
        days: Math.max(1, parseInt($("#qDays").value, 10) || 14),
      };
      S.doc.q = q;
      const supply = q.qty * q.unit;
      const vat = q.vat ? Math.round(supply * 0.1) : 0;
      const total = supply + vat;
      $("#docTotal").innerHTML = `<span>공급가액 <b>${fmt(supply)}원</b></span>
        <span>부가세 ${q.vat ? "<b>" + fmt(vat) + "원</b>" : "별도"}</span>
        <span>합계 <b>${fmt(total)}원</b> <span class="muted small">(${korAmt(total)}원정)</span></span>`;

      paper.innerHTML = `
        <h3>견 적 서</h3>
        <div class="p-meta">견적일자: ${todayKr()} &nbsp;|&nbsp; 견적번호: 제 ${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}${String(TODAY.getDate()).padStart(2, "0")}-01 호</div>
        <p>1. 건&nbsp;&nbsp;&nbsp;&nbsp;명: ${esc(q.title || "—")}</p>
        <p>2. 발주기관: ${esc(q.org)}</p>
        <p>3. 계약방법: 소액수의계약(견적제출) &nbsp; 4. 납&nbsp;기: 계약일로부터 ${q.days}일 이내</p>
        <p>5. 납품장소: ${esc(q.org)} 지정 장소</p>
        <p>6. 견적유효기간: 견적일로부터 30일</p>
        <table>
          <thead><tr><th style="width:34%">품명</th><th>규격</th><th style="width:12%">수량</th><th style="width:16%">단가</th><th style="width:20%">금액</th></tr></thead>
          <tbody>
            <tr><td>${esc(q.item || "—")}</td><td>${esc(q.spec || "-")}</td><td>${fmt(q.qty)}</td><td>${fmt(q.unit)}</td><td>${fmt(supply)}</td></tr>
            <tr><td colspan="4" style="text-align:right;font-weight:700">공급가액</td><td>${fmt(supply)}</td></tr>
            <tr><td colspan="4" style="text-align:right;font-weight:700">부가가치세</td><td>${q.vat ? fmt(vat) : "별도"}</td></tr>
            <tr><td colspan="4" style="text-align:right;font-weight:700">합계금액</td><td>${fmt(total)}</td></tr>
          </tbody>
        </table>
        <p style="margin-top:12px">위 금액은 부가가치세 ${q.vat ? "포함" : "별도"} 금액 <b>${total ? "일금 " + korAmt(total) + "원정" : "일금 0원정"} (₩${fmt(total)})</b>으로, 상기 물품을 위 조건대로 납품하고자 견적서를 제출합니다.</p>
        <p class="p-note" style="margin-top:10px">※ 낙찰 시 계약 상대자로 선정되면 정해진 기한 내에 계약을 체결하고, 물품은 발주기관이 지정한 장소로 직접 납품합니다.</p>
        ${companyBlock()}`;
      return;
    }

    if (type === "integrity") {
      $("#docTotal").innerHTML = `<span>청렴계약이행서약서 · 발주기관 제출용</span><span class="muted small">서명 날인 후 제출</span>`;
      paper.innerHTML = `
        <div class="p-title">청렴계약이행서약서</div>
        <p>본인은 「지방자치단체를 당사자로 하는 계약에 관한 법률」 및 관계 법령에 따라 실시하는 본 입찰·계약에 참여함에 있어, 아래 사항을 준수할 것을 서약합니다.</p>
        <ol>
          <li>입찰 및 계약의 체결·이행·완료의 전 과정에서 관계 법령과 계약 조건을 성실히 준수한다.</li>
          <li>금품·향응의 제공 및 수수, 부정한 청탁·알선, 허위·부정한 방법에 의한 서류 제출 등 일체의 부정행위를 하지 않는다.</li>
          <li>발주기관의 공무원 및 관계자에게 직무와 관련된 어떠한 이익도 제공하지 않는다.</li>
          <li>하도급·재하도급 또는 물품 공급 과정에서도 위 사항을 준수한다.</li>
        </ol>
        <p>위 사항을 위반한 사실이 확인될 경우, 입찰참가자격 제한, 계약의 해제·해지, 부당이득의 환수 등 관계 법령에 따른 불이익을 감수할 것을 확약합니다.</p>
        ${companyBlock()}`;
      return;
    }

    $("#docTotal").innerHTML = `<span>수의계약 각서(결격사유 없음 확인서) · 발주기관 제출용</span><span class="muted small">서명 날인 후 제출</span>`;
    paper.innerHTML = `
      <div class="p-title">수 의 계 약 각 서</div>
      <p>본인은 「지방자치단체를 당사자로 하는 계약에 관한 법률」 제31조 및 같은 법 시행령 제92조에 따른 <b>부정당업자의 입찰참가자격 제한 사유(결격사유)에 해당하지 아니함</b>을 아래와 같이 확인하며, 수의계약 체결을 신청합니다.</p>
      <div class="p-check">
        <ol>
          <li>입찰·계약 서류를 허위로 작성하거나 제출한 사실이 없습니다.</li>
          <li>정당한 사유 없이 계약을 이행하지 아니한 사실이 없습니다.</li>
          <li>국가·지방자치단체의 공무원에게 금품·향응을 제공한 사실이 없습니다.</li>
          <li>관세·국세·지방세를 체납하고 있지 않습니다.</li>
          <li>「중소기업제품 구매촉진 및 판로지원에 관한 법률」 등 관련 법령에 따른 제한을 받고 있지 않습니다.</li>
        </ol>
      </div>
      <p>만일 위 확인 내용이 허위로 판명될 경우, 계약의 해제·해지, 입찰참가자격 제한 등 어떠한 불이익도 감수할 것을 확약합니다.</p>
      ${companyBlock()}`;
  }

  function watchMessage() {
    const kws = S.keywords.length ? S.keywords.join(", ") : "(키워드 없음)";
    return `매일 아침 7시 30분에 안산시 입찰공고 게시판과 발주계획을 확인해서, 등록 키워드(${kws})에 해당하는 2,000만 원 이하 물품 공고만 골라 알려줘.\n새 공고는 공고번호·공고명·마감일시·원문 링크까지 함께. 물품이 아닌 공사·용역은 빼고, 마감이 지난 건도 빼줘.`;
  }

  /* ---------------- modal ---------------- */
  function openModal(title, html) {
    $("#modalTitle").textContent = title;
    $("#modalBody").innerHTML = html;
    $("#modal").classList.add("open");
  }
  function closeModal() { $("#modal").classList.remove("open"); }

  /* ---------------- events ---------------- */
  function bind() {
    $$(".nav-item").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#menuBtn").addEventListener("click", () => {
      $("#sidebar").classList.add("open");
      $("#scrim").classList.add("open");
    });
    $("#scrim").addEventListener("click", () => {
      $("#sidebar").classList.remove("open");
      $("#scrim").classList.remove("open");
    });
    $("#modalClose").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

    /* keywords */
    const addKw = () => {
      const v = $("#kwInput").value.trim();
      if (!v) return;
      if (S.keywords.length >= 30) return toast("키워드는 30개까지 저장됩니다.");
      if (S.keywords.indexOf(v) >= 0) return toast("이미 등록된 키워드입니다.");
      S.keywords.push(v);
      store("bidbot.kw.v1", S.keywords);
      $("#kwInput").value = "";
      renderRadar();
      toast(`"${v}" 감시를 시작합니다.`);
    };
    $("#kwAdd").addEventListener("click", addKw);
    $("#kwInput").addEventListener("keydown", (e) => { if (e.key === "Enter") addKw(); });
    $("#kwReset").addEventListener("click", () => {
      S.keywords = DEFAULT_KW.slice();
      store("bidbot.kw.v1", S.keywords);
      renderRadar();
      toast("기본 키워드로 되돌렸습니다.");
    });
    $("#synToggle").addEventListener("change", (e) => {
      S.synOn = e.target.checked;
      store("bidbot.syn.v1", S.synOn);
      renderRadar();
    });

    const onAction = (e) => {
      const del = e.target.closest("[data-kwdel]");
      if (del) {
        S.keywords = S.keywords.filter((k) => k !== del.dataset.kwdel);
        store("bidbot.kw.v1", S.keywords);
        renderRadar();
        return;
      }
      const sug = e.target.closest("[data-suggest]");
      if (sug) {
        if (S.keywords.indexOf(sug.dataset.suggest) < 0) {
          S.keywords.push(sug.dataset.suggest);
          store("bidbot.kw.v1", S.keywords);
        }
        renderRadar();
        return;
      }
      const calcBtn = e.target.closest("[data-calc]");
      if (calcBtn) {
        setView("predict");
        $("#pBase").value = calcBtn.dataset.calc;
        $("#pEstimate").value = calcBtn.dataset.calc;
        renderPredict();
        toast("기초금액을 넣었습니다. 원가·배송비를 채우세요.");
        return;
      }
      const sup = e.target.closest("[data-supplier]");
      if (sup) { supplierModal(sup.dataset.supplier); return; }
      const past = e.target.closest("[data-past]");
      if (past) {
        S.rivals.q = past.dataset.past;
        S.rivals.mode = "contract";
        S.rivals.page = 1;
        $("#rvQ").value = S.rivals.q;
        $$(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "contract"));
        setView("rivals");
        renderRivals();
        return;
      }
      const pg = e.target.closest("[data-page]");
      if (pg) { S.rivals.page = parseInt(pg.dataset.page, 10) || 1; renderRivals(); return; }
      const fav = e.target.closest("[data-fav]");
      if (fav) {
        const n = fav.dataset.fav;
        const i = S.favs.indexOf(n);
        if (i >= 0) S.favs.splice(i, 1); else S.favs.push(n);
        store("bidbot.favs.v1", S.favs);
        renderFavs();
        if (S.view === "rivals") renderRivals();
        if (fav.classList.contains("fav-btn")) {
          fav.classList.toggle("on", i < 0);
          fav.textContent = i < 0 ? "★" : "☆";
        } else if (fav.closest("#modalBody")) {
          fav.textContent = i < 0 ? "관심 경쟁사 해제" : "관심 경쟁사로 저장";
          fav.className = "btn sm " + (i < 0 ? "ghost" : "primary");
        }
        toast(i >= 0 ? "관심 경쟁사에서 뺐습니다." : "관심 경쟁사로 저장했습니다.");
        return;
      }
      const vb = e.target.closest("[data-vendor]");
      if (vb) { vendorModal(vb.dataset.vendor); return; }
      const vl = e.target.closest("[data-vendorlist]");
      if (vl) {
        closeModal();
        S.rivals.q = vl.dataset.vendorlist;
        S.rivals.mode = "contract";
        S.rivals.page = 1;
        $("#rvQ").value = S.rivals.q;
        $$(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "contract"));
        setView("rivals");
        renderRivals();
      }
    };
    $("#content").addEventListener("click", onAction);
    $("#modalBody").addEventListener("click", onAction);

    $("#pastMore").addEventListener("click", () => {
      S.rivals.q = S.keywords[0] || "";
      S.rivals.mode = "contract";
      S.rivals.page = 1;
      $("#rvQ").value = S.rivals.q;
      $$(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === "contract"));
      setView("rivals");
      renderRivals();
    });

    /* predict */
    ["#pBase", "#pEstimate", "#pCost", "#pShip", "#pFee"].forEach((id) => $(id).addEventListener("input", renderPredict));
    ["#pFloor", "#pRange"].forEach((id) => $(id).addEventListener("change", renderPredict));
    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => {
      const p = PRESETS[b.dataset.preset];
      $("#pBase").value = p.base; $("#pCost").value = p.cost;
      $("#pShip").value = p.ship; $("#pFee").value = p.fee;
      $("#pEstimate").value = p.est || "";
      renderPredict();
      toast("프리셋을 불러왔습니다.");
    }));
    $("#pfReset").addEventListener("click", () => {
      $("#pBase").value = 12000000; $("#pEstimate").value = ""; $("#pCost").value = 5400000;
      $("#pShip").value = 150000; $("#pFee").value = 1.5;
      $("#pFloor").value = "87.745"; $("#pRange").value = "2";
      renderPredict();
    });
    $("#goQuote").addEventListener("click", () => {
      const r = computePredict();
      $("#qUnit").value = r.rec;
      $("#qQty").value = 1;
      setView("docs");
      renderDoc();
      toast("권장 투찰가를 견적 단가로 넣었습니다. 품명·규격만 채우세요.");
    });

    /* rivals */
    let qTimer = null;
    $("#rvQ").addEventListener("input", (e) => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        S.rivals.q = e.target.value;
        S.rivals.page = 1;
        renderRivals();
      }, 180);
    });
    $("#rvMin").addEventListener("input", (e) => { S.rivals.min = e.target.value; S.rivals.page = 1; renderRivals(); });
    $("#rvMax").addEventListener("input", (e) => { S.rivals.max = e.target.value; S.rivals.page = 1; renderRivals(); });
    $("#rvYear").addEventListener("change", (e) => { S.rivals.year = e.target.value; S.rivals.page = 1; renderRivals(); });
    $("#rvFavOnly").addEventListener("change", (e) => { S.rivals.favOnly = e.target.checked; S.rivals.page = 1; renderRivals(); });
    $$(".seg-btn").forEach((b) => b.addEventListener("click", () => {
      S.rivals.mode = b.dataset.mode;
      S.rivals.page = 1;
      $$(".seg-btn").forEach((x) => x.classList.toggle("active", x === b));
      renderRivals();
    }));

    /* docs */
    const coFields = [["#coName", "name"], ["#coCeo", "ceo"], ["#coBiz", "biz"], ["#coOpen", "open"], ["#coAddr", "addr"], ["#coTel", "tel"], ["#coMail", "mail"]];
    coFields.forEach(([sel, key]) => {
      $(sel).value = S.company[key] || "";
      $(sel).addEventListener("input", (e) => {
        S.company[key] = e.target.value;
        store("bidbot.company.v1", S.company);
        $("#sbBizNo").textContent = S.company.biz;
        renderDoc();
      });
    });
    $("#coReset").addEventListener("click", () => {
      S.company = Object.assign({}, DEFAULT_COMPANY);
      store("bidbot.company.v1", S.company);
      coFields.forEach(([sel, key]) => { $(sel).value = S.company[key] || ""; });
      $("#sbBizNo").textContent = S.company.biz;
      renderDoc();
      toast("사업자 정보를 기본값으로 되돌렸습니다.");
    });
    $$(".doc-tab").forEach((b) => b.addEventListener("click", () => {
      S.doc.type = b.dataset.doc;
      $$(".doc-tab").forEach((x) => x.classList.toggle("active", x === b));
      $("#paper").removeAttribute("contenteditable");
      renderDoc();
    }));
    ["#qTitle", "#qOrg", "#qItem", "#qSpec", "#qQty", "#qUnit", "#qDays"].forEach((id) => $(id).addEventListener("input", renderDoc));
    $("#qVat").addEventListener("change", renderDoc);
    $("#docPrint").addEventListener("click", () => {
      const area = $("#printArea");
      if (area) {
        area.innerHTML = "";
        const clone = $("#paper").cloneNode(true);
        clone.removeAttribute("contenteditable");
        area.appendChild(clone);
      }
      window.print();
      setTimeout(() => { if (area) area.innerHTML = ""; }, 1500);
    });
    $("#docCopy").addEventListener("click", async () => {
      const ok = await copyText($("#paper").innerText);
      toast(ok ? "서류 문구를 복사했습니다." : "복사가 막혔습니다. 직접 선택해 복사하세요.");
    });
    $("#docEdit").addEventListener("click", () => {
      const p = $("#paper");
      const on = p.getAttribute("contenteditable") === "true";
      if (on) { p.removeAttribute("contenteditable"); $("#docEdit").textContent = "내용 수정"; toast("수정 내용은 이 화면에만 반영됩니다."); }
      else { p.setAttribute("contenteditable", "true"); $("#docEdit").textContent = "수정 완료"; p.focus(); }
    });
    $("#watchCopy").addEventListener("click", async () => {
      const ok = await copyText(watchMessage());
      toast(ok ? "써니에게 보낼 문구를 복사했습니다." : "복사가 막혔습니다.");
    });

    $("#expKw").addEventListener("click", () => {
      download(`bidbot_키워드_${todayStr}.csv`, csv([["키워드", "동의어확장"], ...S.keywords.map((k) => [k, (SYN[k] || []).join(" / ")])]));
    });
    $("#expMatch").addEventListener("click", () => {
      const rows = [["구분", "월", "공고명", "규격", "방식", "금액", "부서", "담당", "연락처"]];
      plannedMatches().forEach((p) => rows.push(["발주예정", p.month, p.title, p.scale, p.method, p.amount, p.dept, p.officer, p.phone]));
      activeMatches().forEach((a) => rows.push(["공고", a.date, a.title, "", a.kind, "", a.dept, "", ""]));
      download(`bidbot_매칭_${todayStr}.csv`, csv(rows));
    });
    $("#expCt").addEventListener("click", () => {
      const rows = [["계약일", "품목", "부서", "기관", "계약금액", "업체"]];
      contractMatches().forEach((c) => rows.push([c[4], c[2], c[1], c[0], c[3], c[5]]));
      download(`bidbot_계약이력_${todayStr}.csv`, csv(rows));
    });
    $("#expJson").addEventListener("click", () => {
      const dump = {
        exportedAt: new Date().toISOString(),
        keywords: S.keywords,
        synOn: S.synOn,
        company: S.company,
        favorites: S.favs,
        dataMeta: D.meta,
        matches: { planned: plannedMatches().length, active: activeMatches().length, contracts: contractMatches().length },
      };
      download(`bidbot_backup_${todayStr}.json`, JSON.stringify(dump, null, 2), "application/json");
    });
  }

  /* ---------------- init ---------------- */
  function init() {
    if (!D) {
      document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">데이터를 불러오지 못했습니다. data.js 파일을 확인하세요.</p>';
      return;
    }
    $("#chipDb").textContent = `DB ${fmt(D.meta.contractCount)}건 · 수집 ${D.meta.collected}`;
    $("#chipLive").textContent = `게시판 실시간 · ${D.meta.liveChecked || D.meta.collected}`;
    $("#sbBizNo").textContent = S.company.biz;
    $("#coName").value = S.company.name;

    bind();
    renderRadar();
    renderPredict();
    renderRivals();
    renderTrend();
    renderDoc();
    renderFavs();
    $("#kwInput") && ($("#kwInput").value = "");
    if (S.view !== "radar") setView(S.view);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
