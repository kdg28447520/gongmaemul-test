/* 동곤 헬프스토어 PRO — core: 내비게이션 / 소싱 판정 / 광고 분석 */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const num = (id) => {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return 0;
    const v = parseFloat(String(el.value).replace(/[^0-9.\-]/g, ""));
    return isFinite(v) ? v : 0;
  };
  const won = (n) => {
    if (!isFinite(n)) return "—";
    const sign = n < 0 ? "-" : "";
    return sign + Math.round(Math.abs(n)).toLocaleString("ko-KR") + "원";
  };
  const pct = (n, d) => (isFinite(n) ? n.toFixed(d === undefined ? 1 : d) + "%" : "—");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  function copyText(text, msg) {
    const done = () => toast(msg || "복사했습니다");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      ta.remove();
      done();
    }
  }

  /* ── 시즌 데이터 ─────────────────────────── */
  const LUNAR = {
    seollal: { 2026: "2026-02-17", 2027: "2027-02-06", 2028: "2028-01-26" },
    chuseok: { 2026: "2026-09-25", 2027: "2027-09-15", 2028: "2028-10-03" }
  };
  const SEASONS = [
    { id: "seollal", name: "설 연휴", month: 2, heat: 3, lead: 3.5, lunar: true, desc: "선물·주방·식품" },
    { id: "newyear", name: "연초 정리·다이어트", month: 1, day: 5, heat: 2, lead: 2, desc: "정리·건강·홈트" },
    { id: "school", name: "신학기", month: 3, day: 2, heat: 2, lead: 4, desc: "문구·가전·가방" },
    { id: "white", name: "화이트데이", month: 3, day: 14, heat: 1, lead: 3, desc: "과자·뷰티·소품" },
    { id: "family", name: "가정의 달", month: 5, day: 5, heat: 3, lead: 3, desc: "효도·선물·식품" },
    { id: "vacance", name: "바캉스", month: 7, day: 20, heat: 3, lead: 4, desc: "물놀이·차박·휴대" },
    { id: "chuseok", name: "추석", month: 9, heat: 3, lead: 4, lunar: true, desc: "선물세트·식품" },
    { id: "kimjang", name: "김장·가을 캠핑", month: 10, day: 15, heat: 2, lead: 3, desc: "주방·캠핑" },
    { id: "pepero", name: "수능·빼빼로", month: 11, day: 11, heat: 2, lead: 2, desc: "간식·응원선물" },
    { id: "blackfriday", name: "블랙프라이데이", month: 11, day: 26, heat: 3, lead: 3, desc: "가전·패션·잡화" },
    { id: "xmas", name: "크리스마스·연말", month: 12, day: 25, heat: 3, lead: 3, desc: "선물·파티·홈데코" }
  ];
  const SEASON_BY_ID = {};
  SEASONS.forEach((s) => { SEASON_BY_ID[s.id] = s; });

  function seasonDate(s, year) {
    if (s.lunar && LUNAR[s.id]) {
      const k = LUNAR[s.id][year];
      if (k) return new Date(k + "T00:00:00+09:00");
      const keys = Object.keys(LUNAR[s.id]);
      return new Date(LUNAR[s.id][keys[keys.length - 1]] + "T00:00:00+09:00");
    }
    return new Date(year, s.month - 1, s.day || 15, 0, 0, 0);
  }
  function nextSeason(s, from) {
    const base = from || new Date();
    for (let y = base.getFullYear(); y <= base.getFullYear() + 3; y++) {
      const d = seasonDate(s, y);
      if (d.getTime() >= base.getTime()) return d;
    }
    return null;
  }
  function addDays(d, n) { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  function fmtDate(d, withYear) {
    if (!d) return "—";
    const y = withYear ? d.getFullYear() + "년 " : "";
    return y + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + WD[d.getDay()] + ")";
  }
  function dday(d) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const x = new Date(d.getTime()); x.setHours(0, 0, 0, 0);
    return Math.round((x - t) / 86400000);
  }

  const CAT_SEASONS = {
    living: ["seollal", "chuseok", "xmas"],
    fresh: ["seollal", "chuseok", "family"],
    car: ["vacance", "blackfriday", "xmas"],
    beauty: ["white", "family", "xmas"],
    fashion: ["school", "blackfriday", "xmas"],
    digital: ["blackfriday", "school", "newyear"],
    pet: ["family", "xmas", "seollal"],
    hobby: ["family", "vacance", "kimjang"]
  };

  /* ── 내비게이션 ──────────────────────────── */
  const sidebar = $("#sidebar");
  const backdrop = $("#backdrop");
  function setView(id) {
    const view = document.getElementById("view-" + id);
    if (!view) return;
    $$(".view").forEach((v) => v.classList.toggle("active", v === view));
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === id));
    $("#pageTitle").textContent = view.dataset.title || "동곤 헬프스토어 PRO";
    $("#pageSub").textContent = view.dataset.sub || "";
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$(".nav-item").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  $("#btnMenu").addEventListener("click", () => {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
  });
  backdrop.addEventListener("click", () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  });

  /* ══════════════════════════════════════════
     1. 소싱 마진계산기
     ══════════════════════════════════════════ */
  const PRESETS = {
    stanley: { name: "스탠리 풀메탈 컵홀더", cat: "car", price: 39000, cur: "CNY", cost: 32, rate: 195, ship: 4800, fee: 10.8, ad: 12, ret: 3, search: 28000, adShare: 14, variety: "wide", reviews: 260, trend: "up" },
    tangerine: { name: "극조생 감귤 5kg", cat: "fresh", price: 19900, cur: "KRW", cost: 12000, rate: 195, ship: 3000, fee: 10.8, ad: 8, ret: 5, search: 38000, adShare: 12, variety: "medium", reviews: 900, trend: "up" },
    tray: { name: "차량용 트레이", cat: "car", price: 24900, cur: "CNY", cost: 11, rate: 195, ship: 3200, fee: 10.8, ad: 15, ret: 4, search: 16000, adShare: 22, variety: "wide", reviews: 210, trend: "flat" },
    demo: { name: "기계식 키보드", cat: "digital", price: 59000, cur: "KRW", cost: 24000, rate: 195, ship: 3000, fee: 10.8, ad: 18, ret: 2, search: 9495, adShare: 25.38, variety: "wide", reviews: 620, trend: "up" }
  };

  const CAT_LABEL = { living: "생활·주방", fresh: "신선식품", car: "차량용품", beauty: "뷰티·건강", fashion: "패션·잡화", digital: "가전·디지털", pet: "반려동물", hobby: "취미·캠핑" };

  const GAPS = {
    living: [
      ["배송 중 깨짐·흠집", "이중 포장 + 박스 보강, 상세페이지에 포장 컷 노출"],
      ["마감·도장 불량", "입고 전 건별 검수, 불량률 3% 이내 조건을 공급처와 계약"],
      ["교환·응대 지연", "교환 절차를 상세페이지 하단에 명문화, 24시간 내 회신 약속"]
    ],
    fresh: [
      ["배송 중 파손·무름", "알갱이 선별 + 통풍 포장, 아이스팩·완충재 분리 동봉"],
      ["크기·당도 편차", "등급 기준(크기·당도)을 상세페이지에 수치로 표기"],
      ["출고 지연 문의", "출고 마감 시각과 산지 직송 일정을 첫 화면에 표기"]
    ],
    car: [
      ["차종 호환 불확실", "차종별 장착 호환표를 이미지로 제작, 문의 키워드 선점"],
      ["주행 중 흔들림·소음", "고정 패드·미끄럼 방지 실리콘 보강, 장착 영상 첨부"],
      ["소재 냄새", "무취 소재 인증 문구와 3일 환기 안내를 삽입"]
    ],
    beauty: [
      ["자극·향 불만", "저자극 테스트 문구와 향 강도 표기를 명확히"],
      ["용량 대비 가격", "1회 사용량 기준 가격 비교표를 상세페이지에 삽입"],
      ["성분 표기 부족", "전성분과 사용 순서를 이미지 카드로 정리"]
    ],
    fashion: [
      ["사이즈 오차", "실측 표(어깨·가슴·총장)와 모델 착용 사이즈 병기"],
      ["색상 차이", "실내·실외 2종 조명 컷으로 색 재현"],
      ["봉제 마감", "내부 박음질 클로즈업 컷과 검수 기준 문구"]
    ],
    digital: [
      ["초기 불량", "출고 전 전원·페어링 테스트, 검수 스티커 부착"],
      ["설명서 부족", "한글 설정 가이드를 이미지 3장으로 제작"],
      ["A/S 응대 지연", "교환·수리 접수 채널과 처리 기한 명시"]
    ],
    pet: [
      ["냄새·털 빠짐", "세탁 전후 비교 컷과 소재 시험 성적 표기"],
      ["사이즈 불일치", "체중·목둘레 기준 사이즈 표 제공"],
      ["내구성", "하중 테스트 수치와 보증 기간 명시"]
    ],
    hobby: [
      ["조립 난이도", "단계별 조립 컷 3장과 소요 시간 표기"],
      ["부품 누락", "출고 전 부품 체크리스트 동봉"],
      ["보관 부피", "접었을 때 치수와 보관 가방 포함 여부 표기"]
    ]
  };

  function judge(d) {
    const items = [];
    items.push({
      label: "월 검색 수요", value: d.search.toLocaleString("ko-KR") + "회",
      eval: d.search >= 15000 ? "수요 충분" : d.search >= 8000 ? "작은 시장" : "전체 시장이 작음",
      score: d.search >= 15000 ? 1 : 0
    });
    items.push({
      label: "광고비 비중", value: pct(d.adShare, 2),
      eval: d.adShare <= 15 ? "경쟁 광고 적음" : d.adShare <= 25 ? "경고" : "과열",
      score: d.adShare <= 15 ? 1 : 0
    });
    const vmap = { single: ["단일 가격대", "단일"], medium: ["가격대 2~3개", "보통"], wide: ["가격대별 빈틈 존재", "다양"] };
    items.push({ label: "가격 다양성", value: vmap[d.variety][1], eval: vmap[d.variety][0], score: d.variety === "wide" ? 1 : 0 });
    items.push({
      label: "리뷰 진입장벽", value: d.reviews.toLocaleString("ko-KR") + "개",
      eval: d.reviews <= 300 ? "낮음 — 극복 가능" : d.reviews <= 800 ? "중간" : "높음 — 진입장벽",
      score: d.reviews <= 300 ? 1 : 0
    });
    const tmap = { up: ["최근 시즌 반응 살아있음", "상승"], flat: ["평시 수준 유지", "보합"], down: ["최근 하락", "하락"] };
    items.push({ label: "트렌드 방향", value: tmap[d.trend][1], eval: tmap[d.trend][0], score: d.trend === "up" ? 1 : 0 });
    items.push({
      label: "실마진율", value: pct(d.margin),
      eval: d.margin >= 20 ? "충분" : d.margin >= 10 ? "얇음" : "부족",
      score: d.margin >= 20 ? 1 : 0
    });
    let score = items.reduce((a, b) => a + b.score, 0);
    let verdict = score >= 5 ? "ok" : score >= 3 ? "warn" : "bad";
    if (d.margin < 0) verdict = "bad";
    else if (d.margin < 5) verdict = "bad";
    else if (d.margin < 10 && verdict === "ok") verdict = "warn";
    return { items, score, verdict };
  }

  function renderSourcing() {
    const cur = $("#sCur").value;
    $("#costUnit").textContent = cur;
    $("#sRate").disabled = cur === "KRW";
    $("#sRate").style.opacity = cur === "KRW" ? 0.5 : 1;

    const price = num("sPrice");
    const cost = cur === "CNY" ? num("sCost") * num("sRate") : num("sCost");
    const ship = num("sShip");
    const feeR = num("sFee") / 100;
    const adR = num("sAd") / 100;
    const retR = num("sReturn") / 100;
    const fee = price * feeR;
    const ad = price * adR;
    const retLoss = retR * (cost + ship + 5000);
    const net = price - cost - ship - fee - ad - retLoss;
    const margin = price > 0 ? (net / price) * 100 : 0;
    const contribution = price - cost - ship - fee - retLoss;
    const bepRoas = contribution > 0 ? (price / contribution) * 100 : Infinity;
    const bepPrice = 1 - feeR - adR > 0 ? (cost + ship + retLoss) / (1 - feeR - adR) : Infinity;

    const d = {
      search: num("sSearch"), adShare: num("sAdShare"), variety: $("#sVariety").value,
      reviews: num("sReviews"), trend: $("#sTrend").value, margin: margin
    };
    const j = judge(d);
    const badge = $("#rJudgeBadge");
    const label = j.verdict === "ok" ? "진입 추천" : j.verdict === "warn" ? "보류" : "진입 비추";
    badge.textContent = label;
    badge.className = "badge " + (j.verdict === "ok" ? "ok" : j.verdict === "warn" ? "warn" : "bad");
    $("#rJudgeSub").textContent = j.verdict === "ok" ? "룰 엔진 통과" : j.verdict === "warn" ? "조건 보완 필요" : "진입하지 마세요";
    $("#rScore").textContent = j.score;
    $("#rRuleScore").textContent = j.score + " / 6";

    const weak = j.items.filter((i) => !i.score).map((i) => i.label);
    const netCls = net >= 0 ? (margin >= 15 ? "ok" : "warn") : "bad";
    $("#rNet").textContent = won(net);
    $("#rNet").className = netCls;
    $("#rMargin").textContent = pct(margin);
    $("#rMargin").className = margin >= 20 ? "ok" : margin >= 10 ? "warn" : "bad";
    $("#rBep").textContent = isFinite(bepRoas) ? Math.round(bepRoas) + "%" : "불가";
    $("#rBep").className = isFinite(bepRoas) ? "brand" : "bad";
    $("#rBepPrice").textContent = isFinite(bepPrice) ? won(bepPrice) : "불가";
    $("#rPriceNote").textContent = won(price);

    // 한 줄 판정
    let line = "";
    if (j.verdict === "ok") {
      line = "수요·광고비중·가격대·리뷰·트렌드·마진 6개 기준 중 " + j.score + "개를 넘겼고, 건당 " + won(net) + "(" + pct(margin) + ")이 남습니다. 지금 들어가도 되는 조건이니, 피크 3주 전 발주로 재고를 맞추고 아래 리뷰 빈틈 3개를 상세페이지에 먼저 박아 넣으세요.";
    } else if (j.verdict === "warn") {
      line = "건당 " + won(net) + "(" + pct(margin) + ")는 남지만 " + weak.slice(0, 2).join("·") + "가 기준선 아래입니다. " + (weak[0] || "부족한 항목") + "를 보완할 근거를 한 번 더 확인하거나, 가격·구성을 바꿔 재계산한 뒤 결정하세요.";
    } else if (margin < 10) {
      line = "건당 " + won(net) + "(" + pct(margin) + ")로 마진 자체가 서지 않습니다. 광고와 반품이 붙는 순간 적자로 돌아서므로, 원가나 판매가를 다시 잡기 전에는 진입하지 마세요.";
    } else {
      line = "마진은 " + pct(margin) + "로 남지만 " + (weak.join("·") || "시장 지표") + "가 기준에 못 미칩니다. 수요가 작거나 광고 경쟁이 센 시장이라 지금 들어가면 광고비로 버티는 싸움이 됩니다.";
    }
    $("#rOneLine").textContent = line;

    // 분해 바
    const parts = [
      ["원가", cost, "#94a3b8"], ["해외배송", ship, "#60a5fa"], ["수수료", fee, "#a78bfa"],
      ["광고", ad, "#fbbf24"], ["반품", retLoss, "#fb7185"], ["순이익", Math.max(net, 0), "#34d399"]
    ];
    const total = parts.reduce((a, b) => a + b[1], 0) || 1;
    $("#rBar").innerHTML = parts.map((p) => '<i style="width:' + (p[1] / total * 100).toFixed(2) + "%;background:" + p[2] + '" title="' + p[0] + '"></i>').join("");
    $("#rLegend").innerHTML = parts.map((p) => '<span><i style="background:' + p[2] + '"></i>' + p[0] + " " + won(p[1]) + "</span>").join("");

    // 6점 룰 표
    $("#rRuleBody").innerHTML = j.items.map((it) => {
      const pill = it.score ? '<span class="pill-mini ok">기준 통과</span>' : '<span class="pill-mini bad">미달</span>';
      return "<tr><td>" + esc(it.label) + "</td><td>" + esc(it.value) + '</td><td><span class="small">' + esc(it.eval) + '</span> ' + pill + '</td><td class="num"><b>' + it.score + "</b> / 1</td></tr>";
    }).join("");

    // 리뷰 빈틈
    const gaps = GAPS[$("#sCategory").value] || GAPS.living;
    $("#rGaps").innerHTML = gaps.map((g) => "<li><b>" + esc(g[0]) + "</b> → " + esc(g[1]) + "</li>").join("");

    // 시즌
    renderSourcingSeason();

    // 타겟 메모
    const targetMap = {
      living: "구매 결정은 40~60대 주부가 하고, 모바일 비중이 높습니다. 상세페이지 첫 화면에 크기·소재·세척 방법을 글자 크게 넣으세요.",
      fresh: "산지·중량·당도를 숫자로 먼저 보여주세요. 새벽 출고·도착 예정일 안내가 재구매를 만듭니다.",
      car: "남성 30~50대 비중이 높고 차종 검색이 함께 붙습니다. 장착 영상과 호환표가 전환을 가릅니다.",
      beauty: "20~40대 여성 중심. 성분·피부 타입·사용 순서를 카드로 끊어 보여주세요.",
      fashion: "사이즈·색상 반품이 전체 반품의 절반입니다. 실측표와 착용 컷이 마진을 지킵니다.",
      digital: "스펙 비교와 호환성 문의가 많습니다. A/S 기간·교환 절차를 첫 화면에 명시하세요.",
      pet: "보호자 감정 소구가 강합니다. 사이즈 기준(체중·목둘레)과 소재 안전성을 수치로 제시하세요.",
      hobby: "사용 장면 영상이 전환을 만듭니다. 조립·설치 난이도를 솔직하게 적는 편이 반품을 줄입니다."
    };
    $("#rTarget").textContent = targetMap[$("#sCategory").value] || targetMap.living;

    updateSummary(margin, j);
  }

  function renderSourcingSeason() {
    const cat = $("#sCategory").value;
    const pick = $("#sMonth").value;
    let list = (CAT_SEASONS[cat] || []).map((id) => SEASON_BY_ID[id]);
    if (pick !== "auto") list = SEASONS.filter((s) => String(s.month) === pick);
    const now = new Date();
    const cands = list.map((s) => ({ s, d: nextSeason(s, now) })).filter((x) => x.d).sort((a, b) => a.d - b.d);
    const box = $("#rSeason");
    if (!cands.length) { box.innerHTML = '<p class="note">시즌 정보를 계산할 수 없습니다.</p>'; return; }
    const main = cands[0];
    const order = addDays(main.d, -Math.round(main.s.lead * 7));
    const arrive = addDays(main.d, -7);
    const dd = dday(main.d);
    box.innerHTML =
      '<div class="strip" style="margin-bottom:8px"><span class="badge brand">' + esc(main.s.name) + "</span>" +
      '<span class="badge gray">' + esc(CAT_LABEL[cat]) + " 기준</span>" +
      '<span class="badge ' + (dd <= 21 ? "bad" : dd <= 45 ? "warn" : "ok") + '">D-' + dd + "</span></div>" +
      '<table class="tbl"><tbody>' +
      "<tr><td>피크</td><td>" + fmtDate(main.d, true) + "</td><td class=\"small\">검색량 급등 구간</td></tr>" +
      "<tr><td>발주 마감</td><td><b>" + fmtDate(order, true) + "</b></td><td class=\"small\">피크 " + main.s.lead + "주 전</td></tr>" +
      "<tr><td>입고 목표</td><td>" + fmtDate(arrive, true) + "</td><td class=\"small\">피크 1주 전</td></tr>" +
      "</tbody></table>" +
      '<p class="note" style="margin-top:8px">' +
      (dd <= 21
        ? "이미 발주 마감이 가깝습니다. 항공 소량으로라도 먼저 들어가고, 다음 시즌(" + esc((cands[1] || main).s.name) + ") 물량을 함께 잡으세요."
        : "지금 발주하면 피크 전 재고 확보가 가능합니다. 광고는 피크 2주 전부터 켜서 리뷰를 쌓으세요.") +
      "</p>" +
      (cands[1] ? '<p class="note">다음 시즌: ' + esc(cands[1].s.name) + " " + fmtDate(cands[1].d, true) + " · 발주 " + fmtDate(addDays(cands[1].d, -Math.round(cands[1].s.lead * 7))) + "</p>" : "");
    window.__nextSeasonLabel = main.s.name + " D-" + dd;
    $("#sumSeason").textContent = main.s.name + " D-" + dd;
    $("#sumSeason").className = dd <= 21 ? "bad" : dd <= 45 ? "warn" : "ok";
  }

  function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    $("#sName").value = p.name;
    $("#sCategory").value = p.cat;
    $("#sPrice").value = p.price;
    $("#sCur").value = p.cur;
    $("#sCost").value = p.cost;
    $("#sRate").value = p.rate;
    $("#sShip").value = p.ship;
    $("#sFee").value = p.fee;
    $("#sAd").value = p.ad;
    $("#sReturn").value = p.ret;
    $("#sSearch").value = p.search;
    $("#sAdShare").value = p.adShare;
    $("#sVariety").value = p.variety;
    $("#sReviews").value = p.reviews;
    $("#sTrend").value = p.trend;
    $$("[data-preset]").forEach((b) => b.classList.toggle("on", b.dataset.preset === key));
    renderSourcing();
    toast(p.name + " 프리셋 적용");
  }

  function initSourcing() {
    const form = $("#view-sourcing-margin");
    form.addEventListener("input", renderSourcing);
    form.addEventListener("change", renderSourcing);
    form.addEventListener("submit", (e) => e.preventDefault());
    $$("[data-preset]").forEach((b) => b.addEventListener("click", () => applyPreset(b.dataset.preset)));
    renderSourcing();
    $$("[data-preset]").forEach((b) => b.classList.toggle("on", b.dataset.preset === "stanley"));
  }

  function updateSummary(margin, j) {
    const jb = $("#sumJudge");
    const label = j.verdict === "ok" ? "진입 추천" : j.verdict === "warn" ? "보류" : "진입 비추";
    jb.textContent = label + " · " + j.score + "/6";
    jb.className = j.verdict === "ok" ? "ok" : j.verdict === "warn" ? "warn" : "bad";
    const mb = $("#sumMargin");
    mb.textContent = pct(margin);
    mb.className = margin >= 20 ? "ok" : margin >= 10 ? "warn" : "bad";
  }

  /* ══════════════════════════════════════════
     2. 쿠팡 AI 광고 분석
     ══════════════════════════════════════════ */
  const SAMPLE_AD = [
    ["키워드", "노출수", "클릭수", "광고비", "주문수", "전환매출"].join("\t"),
    ["기계식 키보드", 92000, 255, 27054, 0, 0].join("\t"),
    ["게이밍 키보드", 61000, 168, 12000, 2, 50520].join("\t"),
    ["로지텍 키보드", 38000, 96, 11800, 0, 0].join("\t"),
    ["앱코 키보드", 25000, 61, 7200, 0, 0].join("\t"),
    ["한성 키보드", 21000, 52, 6100, 0, 0].join("\t"),
    ["무소음 키보드", 43000, 118, 12400, 3, 118800].join("\t"),
    ["저소음 키보드", 31000, 84, 8900, 1, 39000].join("\t"),
    ["키보드 추천", 120000, 210, 21500, 2, 78200].join("\t"),
    ["텐키리스 키보드", 18000, 44, 4900, 1, 42000].join("\t"),
    ["키캡", 26000, 58, 5200, 2, 39800].join("\t"),
    ["키보드 윤활", 15000, 39, 4100, 1, 29000].join("\t"),
    ["사무용 키보드", 22000, 47, 5300, 2, 76000].join("\t"),
    ["아이패드 키보드", 19000, 41, 4600, 0, 0].join("\t"),
    ["기계식 키보드 추천", 27000, 72, 8300, 1, 44900].join("\t"),
    ["블루투스 키보드", 35000, 66, 7400, 1, 39000].join("\t"),
    ["커스텀 키보드", 12000, 25, 3300, 1, 59000].join("\t"),
    ["키보드 스위치", 21000, 43, 4600, 0, 0].join("\t"),
    ["갈축 키보드", 14000, 31, 3200, 0, 0].join("\t")
  ].join("\n");

  const HEAD_ALIAS = {
    keyword: ["키워드", "검색어", "keyword", "kw", "키워드명", "광고키워드"],
    impressions: ["노출수", "노출", "impressions", "impression", "노출횟수", "노출량"],
    clicks: ["클릭수", "클릭", "clicks", "click", "클릭량"],
    cost: ["광고비", "비용", "cost", "spend", "광고비용", "소진금액", "지출"],
    orders: ["주문수", "주문", "전환수", "orders", "conversions", "구매수", "전환건수", "주문건수"],
    revenue: ["전환매출", "매출", "revenue", "sales", "매출액", "구매매출", "총매출"]
  };
  function normHead(h) { return String(h).toLowerCase().replace(/[\s()\-_/.]/g, "").replace(/원|회|건|개|수$/, ""); }
  function headKey(h) {
    const n = normHead(h);
    if (!n) return null;
    for (const key of Object.keys(HEAD_ALIAS)) {
      for (const a of HEAD_ALIAS[key]) if (n === normHead(a)) return key;
    }
    for (const key of Object.keys(HEAD_ALIAS)) {
      for (const a of HEAD_ALIAS[key]) {
        const na = normHead(a);
        if (na.length > 1 && (n.indexOf(na) === 0 || na.indexOf(n) === 0)) return key;
      }
    }
    return null;
  }
  function splitLine(line, d) {
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === d && !q) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out;
  }
  function parseNumber(v) {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/[₩$\s]/g, "").replace(/,/g, "").replace(/%$/, "");
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function parseReport(text) {
    const raw = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
    if (!raw.length) return { rows: [], cols: null, error: "빈 데이터입니다." };
    const first = raw[0];
    const tabs = (first.match(/\t/g) || []).length;
    const commas = (first.match(/,/g) || []).length;
    const semi = (first.match(/;/g) || []).length;
    const d = tabs >= commas && tabs >= semi ? "\t" : commas >= semi ? "," : ";";
    let head = splitLine(raw[0], d);
    let map = {};
    head.forEach((h, i) => { const k = headKey(h); if (k && map[k] === undefined) map[k] = i; });
    let start = 1;
    if (!Object.keys(map).length) {
      // 헤더가 없으면 기본 순서로 가정
      map = { keyword: 0, impressions: 1, clicks: 2, cost: 3, orders: 4, revenue: 5 };
      start = 0;
      head = ["키워드", "노출수", "클릭수", "광고비", "주문수", "전환매출"];
    }
    if (map.keyword === undefined || map.cost === undefined) {
      return { rows: [], cols: map, error: "키워드·광고비 컬럼을 찾지 못했습니다. 첫 줄에 컬럼명을 넣어 주세요." };
    }
    const rows = [];
    for (let i = start; i < raw.length; i++) {
      const cells = splitLine(raw[i], d);
      const kw = (cells[map.keyword] || "").trim();
      if (!kw || /합계|총계|total/i.test(kw)) continue;
      rows.push({
        kw,
        imp: parseNumber(cells[map.impressions]),
        clicks: parseNumber(cells[map.clicks]),
        cost: parseNumber(cells[map.cost]),
        orders: parseNumber(cells[map.orders]),
        rev: parseNumber(cells[map.revenue])
      });
    }
    return { rows, cols: map, error: rows.length ? null : "행을 읽지 못했습니다. 구분자와 컬럼을 확인하세요." };
  }

  const adState = { rows: [], bucket: "drop" };

  function classify(r, cut) {
    const roas = r.cost > 0 ? (r.rev / r.cost) * 100 : (r.rev > 0 ? Infinity : 0);
    const row = Object.assign({}, r, { roas });
    if (r.rev <= 0) {
      row.bucket = r.cost >= 5000 ? "drop" : "watch";
      return row;
    }
    if (roas >= cut) row.bucket = "keep";
    else if (roas >= 100 && roas >= cut * 0.8) row.bucket = "boost";
    else if (roas < 100 && r.cost >= 3000) row.bucket = "drop";
    else row.bucket = "watch";
    return row;
  }

  function analyzeAd() {
    const goal = num("aGoal"), cut = num("aCut");
    const text = $("#aPaste").value.trim() ? $("#aPaste").value : "";
    const parsed = parseReport(text);
    const st = $("#aStatus");
    if (parsed.error) {
      st.innerHTML = '<span style="color:#dc2626">' + esc(parsed.error) + "</span>";
      toast(parsed.error);
      return;
    }
    const rows = parsed.rows.map((r) => classify(r, cut));
    adState.rows = rows;
    const total = rows.reduce((a, r) => ({
      imp: a.imp + r.imp, clicks: a.clicks + r.clicks, cost: a.cost + r.cost,
      orders: a.orders + r.orders, rev: a.rev + r.rev
    }), { imp: 0, clicks: 0, cost: 0, orders: 0, rev: 0 });
    const roas = total.cost > 0 ? (total.rev / total.cost) * 100 : 0;
    const ctr = total.imp > 0 ? (total.clicks / total.imp) * 100 : 0;
    const cvr = total.clicks > 0 ? (total.orders / total.clicks) * 100 : 0;
    const cpc = total.clicks > 0 ? total.cost / total.clicks : 0;

    const cols = Object.keys(parsed.cols).filter((k) => parsed.cols[k] !== undefined);
    st.innerHTML = "인식된 컬럼: <b>" + cols.join(", ") + "</b> / <b>" + rows.length + "행</b>";

    // 진단
    const badge = $("#aDiagBadge");
    const status = roas >= cut ? "수익 구간" : roas >= Math.max(100, cut * 0.9) ? "준흑자" : roas >= 100 ? "커트라인 미달" : "적자";
    badge.textContent = status;
    badge.className = "right badge " + (roas >= cut ? "ok" : roas >= 100 ? "warn" : "bad");
    const rowsHtml = [
      ["기간 광고비", won(total.cost)],
      ["기간 매출", won(total.rev)],
      ["현재 ROAS", pct(roas, 2) + " <span class='small'>/ 커트라인 " + Math.round(cut) + "%</span>"],
      ["목표 ROAS", Math.round(goal) + "% <span class='small'>" + (roas >= goal ? "달성" : "미달") + "</span>"],
      ["노출 · 클릭", total.imp.toLocaleString("ko-KR") + " · " + total.clicks.toLocaleString("ko-KR")],
      ["CTR · CVR", pct(ctr, 2) + " · " + pct(cvr, 2)],
      ["CPC", Math.round(cpc).toLocaleString("ko-KR") + "원"]
    ].map((r) => '<tr><td class="small">' + r[0] + "</td><td class='num'><b>" + r[1] + "</b></td></tr>").join("");
    $("#aDiagBody").innerHTML = rowsHtml;

    const drops = rows.filter((r) => r.bucket === "drop");
    const boosts = rows.filter((r) => r.bucket === "boost");
    const keeps = rows.filter((r) => r.bucket === "keep");
    const zeroOrderSpend = drops.filter((r) => r.rev <= 0).reduce((a, r) => a + r.cost, 0);
    let diag = "";
    if (roas >= cut) {
      diag = "현재 ROAS " + pct(roas, 1) + "로 커트라인(" + Math.round(cut) + "%)을 넘겼습니다. 다만 " + drops.length + "개 키워드가 광고비 " + won(drops.reduce((a, r) => a + r.cost, 0)) + "을 쓰며 손실을 만들고 있습니다. 그 돈을 수익 키워드로 옮기면 같은 예산에서 매출이 더 나옵니다.";
    } else if (roas >= 100) {
      diag = "현재 ROAS " + pct(roas, 1) + "로 광고비는 회수하지만 커트라인(" + Math.round(cut) + "%)에는 못 미칩니다. 주문 0원 키워드에 " + won(zeroOrderSpend) + "이 나갔고, CTR " + pct(ctr, 2) + " · CVR " + pct(cvr, 2) + "입니다. 클릭은 들어오는데 구매 전환이 약하니 상세페이지 첫 화면과 가격을 먼저 점검하세요.";
    } else {
      diag = "현재 ROAS " + pct(roas, 1) + "로 광고비조차 회수하지 못합니다. 주문 0원 키워드에 " + won(zeroOrderSpend) + "이 소진됐습니다. 오늘 안에 손실 키워드를 끄고, 남은 예산을 주문이 나온 키워드에만 몰아야 합니다.";
    }
    $("#aDiagNote").textContent = diag;
    $("#aDiagNote").className = "callout " + (roas >= cut ? "ok" : roas >= 100 ? "warn" : "bad");

    // 액션 3가지
    const actions = [];
    if (drops.length) {
      const top = drops.slice().sort((a, b) => b.cost - a.cost)[0];
      actions.push("<b>" + esc(top.kw) + "</b> 외 " + drops.length + "개 키워드 즉시 제외 — 광고비 " + won(drops.reduce((a, r) => a + r.cost, 0)) + "이 주문 " + (zeroOrderSpend > 0 ? "0원" : "적자") + "으로 나가고 있습니다. 부정키워드에 먼저 등록하세요.");
    }
    if (boosts.length) {
      const b = boosts.slice().sort((a, c) => c.roas - a.roas)[0];
      actions.push("<b>" + esc(b.kw) + "</b> 소재·랜딩 강화 — ROAS " + pct(b.roas, 0) + "로 커트라인(" + Math.round(cut) + "%)에 근접한 준흑자입니다. 대표 이미지와 가격, 후기 3개만 보강해도 캠페인 전체가 흑자로 돌아섭니다.");
    }
    if (keeps.length) {
      const k = keeps.slice().sort((a, c) => c.rev - a.rev)[0];
      actions.push("<b>" + esc(k.kw) + "</b>에 예산 확대 — ROAS " + pct(k.roas, 0) + ", 매출 " + won(k.rev) + "로 가장 효율이 좋습니다. 끈 키워드 예산을 이 키워드로 옮기세요.");
    } else if (cvr < 1) {
      actions.push("전환율 " + pct(cvr, 2) + " 개선 — 클릭당 비용 " + Math.round(cpc) + "원은 낮은 편인데 구매가 안 됩니다. 상세페이지 첫 화면(가격·배송·후기)을 다시 잡으세요.");
    } else {
      actions.push("키워드별 예산 재배분 — 주문이 나온 키워드의 노출 점유율을 올리고, 신규 키워드는 하루 5,000원 이하로 테스트하세요.");
    }
    while (actions.length < 3) {
      actions.push(actions.length === 0
        ? "데이터가 적습니다. 최소 7일치 보고서를 넣으면 판정이 안정됩니다."
        : "주간 단위로 이 화면을 다시 돌려 ROAS 변화를 추적하세요.");
    }
    $("#aActions").innerHTML = actions.slice(0, 3).map((a) => "<li>" + a + "</li>").join("");

    // 카운트
    const counts = { drop: 0, watch: 0, boost: 0, keep: 0 };
    rows.forEach((r) => { counts[r.bucket]++; });
    $("#cntDrop").textContent = counts.drop;
    $("#cntWatch").textContent = counts.watch;
    $("#cntBoost").textContent = counts.boost;
    $("#cntKeep").textContent = counts.keep;

    // 부정키워드
    $("#aNegList").textContent = drops.length ? drops.map((r) => r.kw).join("\n") : "끌 키워드가 없습니다.";

    renderAdTable();

    // 요약 바
    const rb = $("#sumRoas");
    rb.textContent = pct(roas, 0) + " / " + Math.round(cut) + "%";
    rb.className = roas >= cut ? "ok" : roas >= 100 ? "warn" : "bad";
    toast("광고 보고서 " + rows.length + "행을 분석했습니다");
  }

  function renderAdTable() {
    const rows = adState.rows.filter((r) => r.bucket === adState.bucket);
    const tb = $("#aTable");
    if (!rows.length) {
      tb.innerHTML = '<tr><td colspan="8" class="note">이 분류에 해당하는 키워드가 없습니다.</td></tr>';
      return;
    }
    const sorted = rows.slice().sort((a, b) => b.cost - a.cost);
    tb.innerHTML = sorted.map((r) => {
      const pill = r.bucket === "drop" ? '<span class="pill-mini bad">끌 키워드</span>'
        : r.bucket === "boost" ? '<span class="pill-mini warn">소재 강화</span>'
        : r.bucket === "keep" ? '<span class="pill-mini ok">수익 유지</span>'
        : '<span class="pill-mini gray">지켜볼</span>';
      const ctr = r.imp > 0 ? (r.clicks / r.imp) * 100 : 0;
      const cvr = r.clicks > 0 ? (r.orders / r.clicks) * 100 : 0;
      const cpc = r.clicks > 0 ? r.cost / r.clicks : 0;
      return "<tr><td><b>" + esc(r.kw) + "</b><div class='small'>주문 " + r.orders + "건</div></td>" +
        '<td class="num">' + won(r.cost) + "</td>" +
        '<td class="num">' + won(r.rev) + "</td>" +
        '<td class="num"><b>' + (isFinite(r.roas) ? pct(r.roas, 0) : "∞") + "</b></td>" +
        '<td class="num">' + pct(ctr, 2) + "</td>" +
        '<td class="num">' + pct(cvr, 2) + "</td>" +
        '<td class="num">' + Math.round(cpc).toLocaleString("ko-KR") + "</td>" +
        "<td>" + pill + "</td></tr>";
    }).join("");
  }

  function initAd() {
    const goal = $("#aGoal"), cut = $("#aCut");
    const sync = () => {
      $("#aGoalVal").textContent = goal.value + "%";
      $("#aCutVal").textContent = cut.value + "%";
      if (adState.rows.length) analyzeAd();
    };
    goal.addEventListener("input", sync);
    cut.addEventListener("input", sync);

    $("#aCutFromMargin").addEventListener("click", () => {
      const margin = parseFloat($("#rMargin").textContent) || 0;
      if (margin <= 0) { toast("소싱 계산기 마진율이 0 이하입니다"); return; }
      const v = clamp(Math.round(100 / (margin / 100) / 5) * 5, 100, 900);
      cut.value = v;
      $("#aCutVal").textContent = v + "%";
      toast("실마진 " + margin + "% 기준 커트라인 " + v + "% 적용");
      if (adState.rows.length) analyzeAd();
    });

    const fileEl = $("#aFile");
    $("#aDrop").addEventListener("click", () => fileEl.click());
    $("#aDrop").addEventListener("dragover", (e) => { e.preventDefault(); $("#aDrop").classList.add("over"); });
    $("#aDrop").addEventListener("dragleave", () => $("#aDrop").classList.remove("over"));
    $("#aDrop").addEventListener("drop", (e) => {
      e.preventDefault();
      $("#aDrop").classList.remove("over");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readFile(f);
    });
    fileEl.addEventListener("change", () => { if (fileEl.files[0]) readFile(fileEl.files[0]); });
    function readFile(f) {
      const reader = new FileReader();
      reader.onload = () => {
        $("#aPaste").value = String(reader.result || "");
        toast(f.name + " 불러왔습니다");
        analyzeAd();
      };
      reader.readAsText(f, "utf-8");
    }

    $("#aSample").addEventListener("click", () => {
      $("#aPaste").value = SAMPLE_AD;
      analyzeAd();
    });
    $("#aRun").addEventListener("click", analyzeAd);
    $("#aClear").addEventListener("click", () => {
      $("#aPaste").value = "";
      $("#aFile").value = "";
      adState.rows = [];
      $("#aStatus").textContent = "인식된 컬럼: — / 0행";
      $("#aTable").innerHTML = '<tr><td colspan="8" class="note">분석 전입니다.</td></tr>';
      $("#aDiagBody").innerHTML = '<tr><td class="note">샘플 데이터를 불러오거나 보고서를 넣고 분석을 실행하세요.</td></tr>';
      $("#aActions").innerHTML = '<li class="note">분석을 실행하면 데이터에 맞춰 자동 생성됩니다.</li>';
      $("#aNegList").textContent = "분석을 실행하면 여기에 표시됩니다.";
      $("#aDiagBadge").textContent = "대기";
      $("#aDiagBadge").className = "right badge gray";
      $("#aDiagNote").textContent = "분석 전입니다.";
      $("#aDiagNote").className = "callout info";
      ["cntDrop", "cntWatch", "cntBoost", "cntKeep"].forEach((id) => { $("#" + id).textContent = "0"; });
      $("#sumRoas").textContent = "—";
      $("#sumRoas").className = "";
    });
    $("#aNegCopy").addEventListener("click", () => {
      const t = $("#aNegList").textContent.trim();
      if (!t || t.indexOf("분석") === 0) { toast("먼저 분석을 실행하세요"); return; }
      copyText(t, "부정키워드 " + t.split("\n").length + "개를 복사했습니다");
    });
    $$("#aTabs button").forEach((b) => b.addEventListener("click", () => {
      adState.bucket = b.dataset.bucket;
      $$("#aTabs button").forEach((x) => x.classList.toggle("active", x === b));
      renderAdTable();
    }));
  }

  window.HS = {
    $, $$, num, won, pct, esc, clamp, toast, copyText, parseReport, parseNumber,
    SEASONS, SEASON_BY_ID, CAT_LABEL, nextSeason, addDays, fmtDate, dday, ddayLabel: dday,
    updateSummary, renderSourcing
  };

  document.addEventListener("DOMContentLoaded", () => {
    initSourcing();
    initAd();
    const hash = (location.hash || "").replace("#", "");
    if (hash && document.getElementById("view-" + hash)) setView(hash);
  });
})();
