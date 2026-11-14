/* 동곤 헬프스토어 PRO — core: 내비게이션 / 실측 DB 소싱 판정 / 광고 분석 */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const DB = window.HSDB;
  const won = (n) => {
    if (n === null || n === undefined || !isFinite(n)) return "—";
    return (n < 0 ? "-" : "") + Math.round(Math.abs(n)).toLocaleString("ko-KR") + "원";
  };
  const pct = (n, d) => (n === null || n === undefined || !isFinite(n) ? "—" : n.toFixed(d === undefined ? 1 : d) + "%");
  const num = (id, def) => {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return def === undefined ? 0 : def;
    const raw = String(el.value).trim();
    if (raw === "") return def === undefined ? 0 : def;
    const n = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : (def === undefined ? 0 : def);
  };
  const numOrNull = (id) => {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return null;
    const raw = String(el.value).trim();
    if (raw === "") return null;
    const n = parseFloat(raw.replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : null;
  };
  const esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1900);
  }
  function copyText(text, msg) {
    const done = () => toast(msg || "복사했습니다");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else fallback();
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      ta.remove(); done();
    }
  }
  const parseDate = (s) => new Date(s + "T00:00:00+09:00");
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const fmtDate = (d, withYear) => d ? (withYear ? d.getFullYear() + "년 " : "") + (d.getMonth() + 1) + "월 " + d.getDate() + "일 (" + WD[d.getDay()] + ")" : "—";
  const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
  const dday = (d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const x = new Date(d.getTime()); x.setHours(0, 0, 0, 0);
    return Math.round((x - t) / 86400000);
  };
  function nextEvents(n) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return DB.seasons.map((s) => Object.assign({}, s, { d: parseDate(s.date) }))
      .filter((s) => s.d >= now).sort((a, b) => a.d - b.d).slice(0, n || 3);
  }

  const FEE = {};
  DB.feeCats.forEach((f) => { FEE[f.id] = f; });
  const PRODUCTS = DB.products;
  const byId = {};
  PRODUCTS.forEach((p) => { byId[p.id] = p; });

  function cfsFor(p) {
    if (p.channel !== "rocket") return { fee: 0, name: "—" };
    if (p.cfsFee) return { fee: p.cfsFee, name: p.cfsName || "—" };
    const m = /(\d+)×(\d+)×(\d+).*?([\d,]+)g/.exec(p.dims || "");
    if (!m) return { fee: 0, name: "미산정" };
    const sum = (+m[1] + +m[2] + +m[3]) / 10;
    const kg = parseFloat(m[4].replace(/,/g, "")) / 1000;
    const hit = DB.cfs.find((c) => sum <= c.maxSum && kg <= c.maxKg) || DB.cfs[DB.cfs.length - 1];
    return { fee: hit.fee, name: hit.name };
  }

  /* ── 내비게이션 ── */
  const sidebar = $("#sidebar"), backdrop = $("#backdrop");
  function setView(id) {
    const view = document.getElementById("view-" + id);
    if (!view) return;
    $$(".view").forEach((v) => v.classList.toggle("active", v === view));
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === id));
    $("#pageTitle").textContent = view.dataset.title || "동곤 헬프스토어 PRO";
    $("#pageSub").textContent = view.dataset.sub || "";
    sidebar.classList.remove("open"); backdrop.classList.remove("show");
    if (history.replaceState) history.replaceState(null, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  $$(".nav-item").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  $("#btnMenu").addEventListener("click", () => { sidebar.classList.add("open"); backdrop.classList.add("show"); });
  backdrop.addEventListener("click", () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); });

  /* ══════════════════════════════════════════
     1. 소싱 마진계산기 (실측 DB)
     ══════════════════════════════════════════ */
  const state = { productId: null, net: 0, margin: 0, price: 0, supply: 0, feeRate: 0, cfs: 0, adRate: null, retRate: null, bepRoas: null, unit: {} };

  function fillFeeCats() {
    $("#sFeeCat").innerHTML = DB.feeCats.map((f) => '<option value="' + f.id + '">' + esc(f.label) + " " + f.rate + "%</option>").join("");
    $("#sProduct").innerHTML = PRODUCTS.map((p) => '<option value="' + p.id + '">' + esc(p.name) + " · " + (p.channel === "rocket" ? "로켓" : "위탁") + "</option>").join("");
  }

  function renderPresets() {
    const row = $("#presetRow");
    row.innerHTML = '<span class="preset-label">실측 프리셋</span>' + PRODUCTS.slice(0, 6).map((p) =>
      '<button class="chip" data-id="' + p.id + '" type="button" title="' + esc(p.source) + '">' + esc(p.name) + "</button>"
    ).join("");
    $$("[data-id]", row).forEach((b) => b.addEventListener("click", () => applyProduct(b.dataset.id, true)));
  }

  function applyProduct(id, mark) {
    const p = byId[id];
    if (!p) return;
    state.productId = id;
    $("#sProduct").value = id;
    $("#sName").value = p.name;
    $("#sChannel").value = p.channel;
    $("#sFeeCat").value = p.feeCat;
    $("#sPrice").value = p.sale;
    $("#sSupply").value = p.supply;
    $("#sDims").value = p.dims || "";
    const c = cfsFor(p);
    $("#sCfs").value = c.fee;
    $("#sCfsName").value = p.channel === "rocket" ? c.name + " (CFS 요금표)" : "CFS 없음 (직송)";
    $("#sCfs").disabled = p.channel !== "rocket";
    // 실제 DB에 있는 시장 데이터만 채운다
    $("#sDemand").value = p.demandIndex !== undefined ? p.demandIndex : "";
    $("#sAdShare").value = "";
    $("#sVariety").value = "";
    $("#sReviews").value = "";
    $("#sTrend").value = "";
    $("#sAd").value = "";
    $("#sRet").value = "";
    const fee = FEE[p.feeCat];
    $("#sSourceNote").innerHTML = "<b>출처</b> " + esc(p.source) + "<br><span style='color:#94a3b8'>" + esc(p.sourceRef) + " · 실측 " + esc(p.measured) + "</span>";
    if (p.demandIndex !== undefined) {
      $("#sSourceNote").innerHTML += "<br>검색 지수 " + p.demandIndex + (p.demandPeak ? " (최고 " + p.demandPeak + ")" : "") + " — " + esc(p.demandSource);
    }
    if (mark) $$("#presetRow .chip").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
    renderSourcing();
  }

  function ruleItems(d) {
    const items = [];
    const unknown = (label, hint) => ({ label, value: "미확인", eval: "직접 확인 필요", score: null, hint });

    items.push(d.demand === null ? Object.assign(unknown("수요 (데이터랩 지수)", "네이버 데이터랩에서 11월 지수 확인"), { hint: "지수 30 이상이면 통과" })
      : { label: "수요 (데이터랩 지수)", value: d.demand.toFixed(1), eval: d.demand >= 30 ? "수요 충분" : d.demand >= 15 ? "작은 시장" : "전체 시장이 작음", score: d.demand >= 30 ? 1 : 0 });

    items.push(d.adShare === null ? Object.assign(unknown("경쟁 광고 비중", "쿠팡 검색 상단 광고 상품 비중 확인"), { hint: "15% 이하면 통과" })
      : { label: "경쟁 광고 비중", value: pct(d.adShare, 2), eval: d.adShare <= 15 ? "경쟁 광고 적음" : d.adShare <= 25 ? "경고" : "과열", score: d.adShare <= 15 ? 1 : 0 });

    const vmap = { single: ["단일 가격대", "가격 빈틈 없음"], medium: ["2~3개 가격대", "보통"], wide: ["4개 이상", "가격대별 빈틈 존재"] };
    items.push(!d.variety ? Object.assign(unknown("가격대 다양성", "검색 결과 가격대 확인"), { hint: "4개 이상이면 통과" })
      : { label: "가격대 다양성", value: vmap[d.variety][0], eval: vmap[d.variety][1], score: d.variety === "wide" ? 1 : 0 });

    items.push(d.reviews === null ? Object.assign(unknown("리뷰 진입장벽", "상위 3개 상품 리뷰 수 확인"), { hint: "300개 이하면 통과" })
      : { label: "리뷰 진입장벽", value: d.reviews.toLocaleString("ko-KR") + "개", eval: d.reviews <= 300 ? "낮음 — 극복 가능" : d.reviews <= 800 ? "중간" : "높음 — 진입장벽", score: d.reviews <= 300 ? 1 : 0 });

    const tmap = { up: ["상승", "최근 시즌 반응 살아있음"], flat: ["보합", "평시 수준"], down: ["하락", "최근 하락"] };
    items.push(!d.trend ? Object.assign(unknown("트렌드 방향", "데이터랩 12개월 추이 확인"), { hint: "상승이면 통과" })
      : { label: "트렌드 방향", value: tmap[d.trend][0], eval: tmap[d.trend][1], score: d.trend === "up" ? 1 : 0 });

    items.push({ label: "실마진율", value: pct(d.margin), eval: d.margin >= 20 ? "충분" : d.margin >= 10 ? "얇음" : "부족", score: d.margin >= 20 ? 1 : 0 });
    return items;
  }

  function renderSourcing() {
    const price = num("sPrice");
    const supply = num("sSupply");
    const feeCat = FEE[$("#sFeeCat").value] || DB.feeCats[0];
    const feeRate = feeCat.rate;
    const channel = $("#sChannel").value;
    const cfs = channel === "rocket" ? num("sCfs") : 0;
    const adRate = numOrNull("sAd");
    const retRate = numOrNull("sRet");
    const fee = price * feeRate / 100;
    const ad = price * (adRate || 0) / 100;
    const retLoss = (retRate || 0) / 100 * (supply + cfs + 5000);
    const net = price - supply - fee - cfs - ad - retLoss;
    const margin = price > 0 ? net / price * 100 : 0;
    const contribution = price - supply - fee - cfs - retLoss;
    const bepRoas = contribution > 0 ? price / contribution * 100 : null;
    const bepPrice = (1 - feeRate / 100 - (adRate || 0) / 100) > 0 ? (supply + cfs + retLoss) / (1 - feeRate / 100 - (adRate || 0) / 100) : null;

    $("#sCfs").disabled = channel !== "rocket";
    if (channel !== "rocket") $("#sCfsName").value = "CFS 없음 (직송)";

    const d = {
      demand: numOrNull("sDemand"), adShare: numOrNull("sAdShare"), variety: $("#sVariety").value,
      reviews: numOrNull("sReviews"), trend: $("#sTrend").value, margin
    };
    const items = ruleItems(d);
    const confirmed = items.filter((i) => i.score !== null).length;
    const score = items.reduce((a, b) => a + (b.score || 0), 0);
    const unknownLabels = items.filter((i) => i.score === null).map((i) => i.label);

    let verdict = "hold", label = "판단 유보", cls = "warn";
    if (price <= 0 || supply <= 0) { verdict = "hold"; label = "입력 필요"; cls = "gray"; }
    else if (margin < 10) { verdict = "bad"; label = "진입 비추"; cls = "bad"; }
    else if (confirmed < 4) { verdict = "hold"; label = "판단 유보"; cls = "warn"; }
    else if (score >= 5) { verdict = "ok"; label = "진입 추천"; cls = "ok"; }
    else if (score >= 3) { verdict = "hold"; label = "보류"; cls = "warn"; }
    else { verdict = "bad"; label = "진입 비추"; cls = "bad"; }

    const badge = $("#rBadge");
    badge.textContent = label;
    badge.className = "badge " + cls;
    $("#rSub").textContent = confirmed < 4 ? "확인 " + confirmed + "개 — 판정 보류" : "룰 엔진 " + score + "/6";
    $("#rConfirmed").textContent = confirmed;
    $("#rRuleScore").textContent = score + " / 6";

    $("#rNet").textContent = won(net);
    $("#rNet").className = net >= 0 ? (margin >= 20 ? "ok" : margin >= 10 ? "warn" : "bad") : "bad";
    $("#rNetSub").textContent = (adRate === null ? "광고 미반영" : "광고 " + adRate + "%") + " · " + (retRate === null ? "반품 미반영" : "반품 " + retRate + "%");
    $("#rMargin").textContent = pct(margin);
    $("#rMargin").className = margin >= 20 ? "ok" : margin >= 10 ? "warn" : "bad";
    $("#rBep").textContent = bepRoas === null ? "산출 불가" : Math.round(bepRoas) + "%";
    $("#rBep").className = bepRoas === null ? "bad" : "brand";
    $("#rBepPrice").textContent = bepPrice === null ? "산출 불가" : won(bepPrice);
    $("#rPriceNote").textContent = won(price) + " · " + feeCat.label + " " + feeRate + "%";

    // 한 줄 판정
    let line;
    if (price <= 0 || supply <= 0) {
      line = "판매가와 매입 원가를 입력하면 계산이 시작됩니다. 실측 DB 상품을 고르면 자동으로 채워집니다.";
    } else if (margin < 10) {
      line = "건당 " + won(net) + "(" + pct(margin) + ")로 마진이 10% 아래입니다. 광고·반품이 붙으면 적자로 돌아서므로 이 조건으로는 진입하지 마세요.";
    } else if (confirmed < 4) {
      line = "실마진 " + pct(margin) + "(" + won(net) + ")는 확보됩니다. 다만 " + unknownLabels.slice(0, 3).join("·") + " " + (unknownLabels.length > 3 ? "등 " : "") + unknownLabels.length + "개 항목이 미확인이라 최종 판정을 보류합니다. 이 " + (4 - confirmed) + "개를 확인하면 바로 확정됩니다.";
    } else if (verdict === "ok") {
      line = "확인된 " + confirmed + "개 항목 중 " + score + "개를 통과했고, 건당 " + won(net) + "(" + pct(margin) + ")이 남습니다. 진입해도 되는 조건입니다. 아래 리뷰 빈틈을 상세페이지에 먼저 넣고, 다음 시즌 발주 마감에 맞춰 재고를 잡으세요.";
    } else if (verdict === "warn") {
      line = "실마진 " + pct(margin) + "는 남지만 " + items.filter((i) => i.score === 0).map((i) => i.label).join("·") + "가 기준선 아래입니다. 그 항목을 보완할 근거가 확인되면 진입, 아니면 가격·구성을 바꿔 재계산하세요.";
    } else {
      line = "실마진은 " + pct(margin) + "로 남지만 시장 지표 " + score + "/6이라 광고비로 버티는 싸움이 됩니다. 수요가 더 큰 인접 키워드로 상품명을 바꾸거나 진입을 미루세요.";
    }
    $("#rOneLine").textContent = line;

    // 분해
    const parts = [
      ["매입 원가", supply, "#94a3b8"], ["수수료", fee, "#a78bfa"], ["CFS·물류", cfs, "#60a5fa"],
      ["광고", ad, "#fbbf24"], ["반품", retLoss, "#fb7185"], ["순이익", Math.max(net, 0), "#34d399"]
    ].filter((p) => p[1] > 0 || p[0] === "순이익");
    const total = parts.reduce((a, b) => a + b[1], 0) || 1;
    $("#rBar").innerHTML = parts.map((p) => '<i style="width:' + (p[1] / total * 100).toFixed(2) + "%;background:" + p[2] + '" title="' + p[0] + '"></i>').join("");
    $("#rLegend").innerHTML = parts.map((p) => '<span><i style="background:' + p[2] + '"></i>' + p[0] + " " + won(p[1]) + "</span>").join("");

    $("#rRuleBody").innerHTML = items.map((it) => {
      const pill = it.score === null ? '<span class="pill-mini gray">미확인</span>'
        : it.score ? '<span class="pill-mini ok">기준 통과</span>' : '<span class="pill-mini bad">미달</span>';
      return "<tr><td>" + esc(it.label) + "</td><td>" + esc(it.value) + '</td><td><span class="small">' + esc(it.eval) + (it.hint ? " · " + esc(it.hint) : "") + "</span> " + pill + '</td><td class="num"><b>' + (it.score === null ? "—" : it.score) + "</b> / 1</td></tr>";
    }).join("");

    $("#rGaps").innerHTML = gapsFor(feeCat.id).map((g) => "<li><b>" + esc(g[0]) + "</b> → " + esc(g[1]) + "</li>").join("");

    renderSeason(feeCat.id);

    const p = byId[state.productId];
    $("#rSource").innerHTML = p
      ? "<b>" + esc(p.source) + "</b><br><span style='color:#94a3b8'>" + esc(p.sourceRef) + " · 실측 " + esc(p.measured) + "</span>" + (p.demandIndex !== undefined ? "<br>검색 지수: " + esc(p.demandSource) : "") + (adRate === null || retRate === null ? "<br>광고·반품은 원천 DB에 실적이 없어 " + (adRate === null && retRate === null ? "둘 다" : "일부") + " 미반영입니다." : "")
      : "실측 DB 상품을 선택하면 출처가 표시됩니다.";

    state.net = net; state.margin = margin; state.price = price; state.supply = supply; state.feeRate = feeRate; state.cfs = cfs;
    state.adRate = adRate; state.retRate = retRate; state.bepRoas = bepRoas;
    state.unit = { supply, fee, cfs, ad, retLoss };

    updateSummary(label, cls, margin, confirmed, score);
    updateSimulator();
  }

  function gapsFor(feeCatId) {
    if (feeCatId === "fresh") return [
      ["파손·무름", "사진 1장 무수거 100% 환불·재발송 보상제를 첫 화면에 명시 (에코앤팜 CS 방식)"],
      ["당도 편차", "브릭스 측정 기준(박스당 5개 이상, 평균 13 이상)을 상품명·상세에 숫자로 표기"],
      ["출고 지연", "발주 마감 오전 10:30, 제철 폭주 시 5~7일 지연 전례 — 출고일 약속을 보수적으로 표기"]
    ];
    if (feeCatId === "car" || feeCatId === "etc") return [
      ["마감·사출 불량", "거친 테두리 샌딩 처리 후 출고, 클로즈업 컷으로 보여주기"],
      ["흔들림·소음", "실리콘 완충 패드 4개 동봉, 장착 영상 첨부"],
      ["배송 파손", "에어캡 3중 포장 + 박스 완충재 강화 (관제탑 체크리스트)"]
    ];
    if (feeCatId === "digital") return [
      ["초기 불량", "출고 전 전원·페어링 테스트 후 검수 스티커 부착"],
      ["설명서 부족", "한글 설정 가이드를 이미지 3장으로 제작"],
      ["A/S 응대 지연", "교환·수리 접수 채널과 처리 기한을 상세 하단에 명시"]
    ];
    if (feeCatId === "fashion") return [
      ["사이즈 오차", "실측 표(어깨·가슴·총장)와 모델 착용 사이즈 병기"],
      ["색상 차이", "실내·실외 2종 조명 컷으로 색 재현"],
      ["봉제 마감", "내부 박음질 클로즈업과 검수 기준 문구"]
    ];
    return [
      ["배송 중 파손", "이중 포장과 박스 보강, 포장 컷 노출"],
      ["마감 불량", "입고 전 건별 검수, 불량률 기준을 공급처와 합의"],
      ["응대 지연", "교환 절차 명문화와 회신 시간 약속"]
    ];
  }

  function catSeasonIds(feeCatId) {
    if (feeCatId === "fresh") return ["설날", "추석", "빼빼로데이", "크리스마스", "블랙프라이데이"];
    if (feeCatId === "car") return ["블랙프라이데이", "크리스마스", "설날", "초복·바캉스"];
    if (feeCatId === "digital") return ["블랙프라이데이", "2027학년도 수능", "신학기", "크리스마스"];
    if (feeCatId === "fashion") return ["신학기", "블랙프라이데이", "크리스마스"];
    return ["설날", "추석", "크리스마스", "블랙프라이데이"];
  }

  function renderSeason(feeCatId) {
    const names = catSeasonIds(feeCatId || "fresh");
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const cands = DB.seasons.map((s) => Object.assign({}, s, { d: parseDate(s.date) }))
      .filter((s) => s.d >= now && names.indexOf(s.name) >= 0)
      .sort((a, b) => a.d - b.d);
    if (!cands.length) { $("#rSeason").innerHTML = '<p class="note">해당 카테고리에 잡힌 다음 시즌이 없습니다.</p>'; return; }
    const main = cands[0];
    const order = addDays(main.d, -Math.round(main.lead * 7));
    const arrive = addDays(main.d, -7);
    const dd = dday(main.d);
    $("#rSeason").innerHTML =
      '<div class="strip" style="margin-bottom:8px"><span class="badge brand">' + esc(main.name) + "</span>" +
      '<span class="badge gray">' + esc(main.kind) + "</span>" +
      '<span class="badge ' + (dd <= 14 ? "bad" : dd <= 35 ? "warn" : "ok") + '">D-' + dd + "</span></div>" +
      '<table class="tbl"><tbody>' +
      "<tr><td>피크</td><td>" + fmtDate(main.d, true) + "</td><td class='small'>" + esc(main.note) + "</td></tr>" +
      "<tr><td>발주 마감</td><td><b>" + fmtDate(order, true) + "</b></td><td class='small'>피크 " + main.lead + "주 전</td></tr>" +
      "<tr><td>입고 목표</td><td>" + fmtDate(arrive, true) + "</td><td class='small'>피크 1주 전</td></tr>" +
      "</tbody></table>" +
      '<p class="note" style="margin-top:8px">' + (dd <= 21 ? "발주 마감이 임박했습니다. 항공 소량이라도 먼저 넣고 다음 시즌 물량을 함께 잡으세요." : "지금 발주하면 피크 전 재고 확보가 가능합니다. 광고는 피크 2주 전부터 켜서 리뷰를 쌓으세요.") + "</p>";
    const el = $("#sumSeason");
    el.textContent = main.name + " D-" + dd;
    el.className = dd <= 14 ? "bad" : dd <= 35 ? "warn" : "ok";
  }

  function updateSummary(label, cls, margin, confirmed, score) {
    const p = byId[state.productId];
    $("#sumProduct").textContent = p ? p.name : "—";
    const mb = $("#sumMargin");
    mb.textContent = pct(margin);
    mb.className = margin >= 20 ? "ok" : margin >= 10 ? "warn" : "bad";
    const jb = $("#sumJudge");
    jb.textContent = label + " · " + confirmed + "/6 확인";
    jb.className = cls === "ok" ? "ok" : cls === "warn" ? "warn" : cls === "bad" ? "bad" : "";
  }

  function initSourcing() {
    fillFeeCats();
    renderPresets();
    const form = $("#view-sourcing-margin");
    form.addEventListener("input", (e) => {
      if (e.target.id === "sProduct") return;
      renderSourcing();
    });
    form.addEventListener("change", (e) => {
      if (e.target.id === "sProduct") applyProduct(e.target.value, true);
      else renderSourcing();
    });
    $("#btnResetProduct").addEventListener("click", () => {
      if (state.productId) { applyProduct(state.productId, true); toast("DB 값으로 되돌렸습니다"); }
    });
    $("#btnSaveProduct").addEventListener("click", () => {
      if (!state.productId) { toast("실측 DB 상품을 먼저 고르세요"); return; }
      const p = byId[state.productId];
      window.HSStore.add({
        type: "sourcing",
        title: p.name + " · " + (state.margin).toFixed(1) + "%",
        data: {
          productId: p.id, product: p.name, channel: $("#sChannel").value, price: state.price, supply: state.supply,
          feeRate: state.feeRate, cfs: state.cfs, adRate: state.adRate, retRate: state.retRate,
          net: Math.round(state.net), margin: +state.margin.toFixed(1), verdict: $("#rBadge").textContent,
          confirmed: +$("#rConfirmed").textContent, score: $("#rRuleScore").textContent,
          source: p.source
        }
      });
      toast("판정을 저장했습니다");
    });
    const saved = window.HSStore.lastInputs && window.HSStore.lastInputs();
    if (saved && byId[saved.productId]) applyProduct(saved.productId, true);
    else applyProduct(PRODUCTS[0].id, true);
  }

  /* ══════════════════════════════════════════
     2. 광고 분석
     ══════════════════════════════════════════ */
  const HEAD_ALIAS = {
    keyword: ["키워드", "검색어", "keyword", "kw", "키워드명", "광고키워드"],
    impressions: ["노출수", "노출", "impressions", "impression", "노출횟수", "노출량"],
    clicks: ["클릭수", "클릭", "clicks", "click", "클릭량"],
    cost: ["광고비", "비용", "cost", "spend", "광고비용", "소진금액", "지출"],
    orders: ["주문수", "주문", "전환수", "orders", "conversions", "구매수", "전환건수", "주문건수"],
    revenue: ["전환매출", "매출", "revenue", "sales", "매출액", "구매매출", "총매출"]
  };
  const normHead = (h) => String(h).toLowerCase().replace(/[\s()\-_/.]/g, "").replace(/원|회|건|개|수$/, "");
  function headKey(h) {
    const n = normHead(h);
    if (!n) return null;
    for (const k of Object.keys(HEAD_ALIAS)) for (const a of HEAD_ALIAS[k]) if (n === normHead(a)) return k;
    for (const k of Object.keys(HEAD_ALIAS)) for (const a of HEAD_ALIAS[k]) {
      const na = normHead(a);
      if (na.length > 1 && (n.indexOf(na) === 0 || na.indexOf(n) === 0)) return k;
    }
    return null;
  }
  function splitLine(line, d) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === d && !q) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur); return out;
  }
  const parseNumber = (v) => {
    if (v === null || v === undefined) return 0;
    const n = parseFloat(String(v).replace(/[₩$\s]/g, "").replace(/,/g, "").replace(/%$/, ""));
    return isFinite(n) ? n : 0;
  };
  function parseReport(text) {
    const raw = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim().length);
    if (!raw.length) return { rows: [], error: "빈 데이터입니다." };
    const first = raw[0];
    const tabs = (first.match(/\t/g) || []).length, commas = (first.match(/,/g) || []).length, semi = (first.match(/;/g) || []).length;
    const d = tabs >= commas && tabs >= semi ? "\t" : commas >= semi ? "," : ";";
    const head = splitLine(raw[0], d);
    let map = {};
    head.forEach((h, i) => { const k = headKey(h); if (k && map[k] === undefined) map[k] = i; });
    let start = 1;
    if (!Object.keys(map).length) {
      map = { keyword: 0, impressions: 1, clicks: 2, cost: 3, orders: 4, revenue: 5 };
      start = 0;
    }
    if (map.keyword === undefined || map.cost === undefined) return { rows: [], error: "키워드·광고비 컬럼을 찾지 못했습니다. 첫 줄에 컬럼명을 넣어 주세요." };
    const rows = [];
    for (let i = start; i < raw.length; i++) {
      const cells = splitLine(raw[i], d);
      const kw = (cells[map.keyword] || "").trim();
      if (!kw || /합계|총계|total/i.test(kw)) continue;
      rows.push({
        kw,
        imp: parseNumber(cells[map.impressions]), clicks: parseNumber(cells[map.clicks]),
        cost: parseNumber(cells[map.cost]), orders: parseNumber(cells[map.orders]), rev: parseNumber(cells[map.revenue])
      });
    }
    return { rows, cols: map, error: rows.length ? null : "행을 읽지 못했습니다. 구분자와 컬럼을 확인하세요." };
  }
  const adState = { rows: [], bucket: "drop", total: null, source: "" };

  function classify(r, cut) {
    const roas = r.cost > 0 ? r.rev / r.cost * 100 : (r.rev > 0 ? Infinity : 0);
    const row = Object.assign({}, r, { roas });
    if (r.rev <= 0) row.bucket = r.cost >= 5000 ? "drop" : "watch";
    else if (roas >= cut) row.bucket = "keep";
    else if (roas >= 100 && roas >= cut * 0.8) row.bucket = "boost";
    else if (roas < 100 && r.cost >= 3000) row.bucket = "drop";
    else row.bucket = "watch";
    return row;
  }

  function analyzeAd() {
    const goal = num("aGoal"), cut = num("aCut");
    const text = $("#aPaste").value;
    const parsed = parseReport(text);
    if (parsed.error) {
      $("#aStatus").innerHTML = '<span style="color:#dc2626">' + esc(parsed.error) + "</span>";
      toast(parsed.error); return;
    }
    const rows = parsed.rows.map((r) => classify(r, cut));
    adState.rows = rows;
    const total = rows.reduce((a, r) => ({ imp: a.imp + r.imp, clicks: a.clicks + r.clicks, cost: a.cost + r.cost, orders: a.orders + r.orders, rev: a.rev + r.rev }), { imp: 0, clicks: 0, cost: 0, orders: 0, rev: 0 });
    adState.total = total;
    const roas = total.cost > 0 ? total.rev / total.cost * 100 : 0;
    const ctr = total.imp > 0 ? total.clicks / total.imp * 100 : 0;
    const cvr = total.clicks > 0 ? total.orders / total.clicks * 100 : 0;
    const cpc = total.clicks > 0 ? total.cost / total.clicks : 0;
    $("#aStatus").innerHTML = "인식된 컬럼: <b>" + Object.keys(parsed.cols).filter((k) => parsed.cols[k] !== undefined).join(", ") + "</b> / <b>" + rows.length + "행</b>";

    const badge = $("#aDiagBadge");
    badge.textContent = roas >= cut ? "수익 구간" : roas >= 100 ? "커트라인 미달" : "적자";
    badge.className = "right badge " + (roas >= cut ? "ok" : roas >= 100 ? "warn" : "bad");

    $("#aDiagBody").innerHTML = [
      ["기간 광고비", won(total.cost)],
      ["기간 매출", won(total.rev)],
      ["현재 ROAS", pct(roas, 2) + " <span class='small'>/ 커트라인 " + Math.round(cut) + "%</span>"],
      ["목표 ROAS", Math.round(goal) + "% <span class='small'>" + (roas >= goal ? "달성" : "미달") + "</span>"],
      ["노출 · 클릭", total.imp.toLocaleString("ko-KR") + " · " + total.clicks.toLocaleString("ko-KR")],
      ["CTR · CVR", pct(ctr, 2) + " · " + pct(cvr, 2)],
      ["평균 CPC", Math.round(cpc).toLocaleString("ko-KR") + "원"]
    ].map((r) => '<tr><td class="small">' + r[0] + "</td><td class='num'><b>" + r[1] + "</b></td></tr>").join("");

    const drops = rows.filter((r) => r.bucket === "drop");
    const boosts = rows.filter((r) => r.bucket === "boost");
    const keeps = rows.filter((r) => r.bucket === "keep");
    const zeroSpend = drops.filter((r) => r.rev <= 0).reduce((a, r) => a + r.cost, 0);
    let diag;
    if (roas >= cut) diag = "ROAS " + pct(roas, 1) + "로 커트라인(" + Math.round(cut) + "%)을 넘겼습니다. 다만 " + drops.length + "개 키워드가 " + won(drops.reduce((a, r) => a + r.cost, 0)) + "을 쓰며 손실을 만들고 있습니다. 그 예산을 수익 키워드로 옮기면 같은 돈에서 매출이 더 나옵니다.";
    else if (roas >= 100) diag = "ROAS " + pct(roas, 1) + "로 광고비는 회수하지만 커트라인(" + Math.round(cut) + "%)에는 못 미칩니다. 주문 0원 키워드에 " + won(zeroSpend) + "이 나갔고 CTR " + pct(ctr, 2) + " · CVR " + pct(cvr, 2) + "입니다. 클릭은 들어오는데 구매가 약하니 상세 첫 화면과 가격을 먼저 점검하세요.";
    else diag = "ROAS " + pct(roas, 1) + "로 광고비조차 회수하지 못합니다. 주문 0원 키워드에 " + won(zeroSpend) + "이 소진됐습니다. 오늘 안에 손실 키워드를 끄고, 남은 예산을 주문이 나온 키워드에만 몰아야 합니다.";
    const note = $("#aDiagNote");
    note.textContent = diag;
    note.className = "callout " + (roas >= cut ? "ok" : roas >= 100 ? "warn" : "bad");

    const acts = [];
    if (drops.length) {
      const top = drops.slice().sort((a, b) => b.cost - a.cost)[0];
      acts.push("<b>" + esc(top.kw) + "</b> 외 " + drops.length + "개 키워드 즉시 제외 — " + won(drops.reduce((a, r) => a + r.cost, 0)) + "이 적자로 나가고 있습니다. 부정키워드에 먼저 등록하세요.");
    }
    if (boosts.length) {
      const b = boosts.slice().sort((a, c) => c.roas - a.roas)[0];
      acts.push("<b>" + esc(b.kw) + "</b> 소재·랜딩 강화 — ROAS " + pct(b.roas, 0) + "로 커트라인(" + Math.round(cut) + "%) 근접입니다. 대표 이미지·가격·후기 3개를 보강하세요.");
    }
    if (keeps.length) {
      const k = keeps.slice().sort((a, c) => c.rev - a.rev)[0];
      acts.push("<b>" + esc(k.kw) + "</b>에 예산 확대 — ROAS " + pct(k.roas, 0) + ", 매출 " + won(k.rev) + "로 가장 효율이 좋습니다. 끈 키워드 예산을 이쪽으로 옮기세요.");
    } else if (cvr < 1) {
      acts.push("전환율 " + pct(cvr, 2) + " 개선 — CPC " + Math.round(cpc) + "원은 낮은 편인데 구매가 안 됩니다. 상세 첫 화면(가격·배송·후기)을 다시 잡으세요.");
    }
    while (acts.length < 3) acts.push(acts.length === 0 ? "데이터가 적습니다. 최소 7일치 보고서를 넣으면 판정이 안정됩니다." : "주간 단위로 이 화면을 다시 돌려 ROAS 변화를 추적하세요.");
    $("#aActions").innerHTML = acts.slice(0, 3).map((a) => "<li>" + a + "</li>").join("");

    const counts = { drop: 0, watch: 0, boost: 0, keep: 0 };
    rows.forEach((r) => { counts[r.bucket]++; });
    $("#cntDrop").textContent = counts.drop; $("#cntWatch").textContent = counts.watch;
    $("#cntBoost").textContent = counts.boost; $("#cntKeep").textContent = counts.keep;
    $("#aNegList").textContent = drops.length ? drops.map((r) => r.kw).join("\n") : "끌 키워드가 없습니다.";
    renderAdTable();
    toast("보고서 " + rows.length + "행을 분석했습니다");
  }

  function renderAdTable() {
    const rows = adState.rows.filter((r) => r.bucket === adState.bucket);
    const tb = $("#aTable");
    if (!rows.length) { tb.innerHTML = '<tr><td colspan="8" class="note">이 분류에 해당하는 키워드가 없습니다.</td></tr>'; return; }
    tb.innerHTML = rows.slice().sort((a, b) => b.cost - a.cost).map((r) => {
      const pill = r.bucket === "drop" ? '<span class="pill-mini bad">끌 키워드</span>'
        : r.bucket === "boost" ? '<span class="pill-mini warn">소재 강화</span>'
        : r.bucket === "keep" ? '<span class="pill-mini ok">수익 유지</span>' : '<span class="pill-mini gray">지켜볼</span>';
      const ctr = r.imp > 0 ? r.clicks / r.imp * 100 : 0;
      const cvr = r.clicks > 0 ? r.orders / r.clicks * 100 : 0;
      const cpc = r.clicks > 0 ? r.cost / r.clicks : 0;
      return "<tr><td><b>" + esc(r.kw) + "</b><div class='small'>주문 " + r.orders + "건</div></td>" +
        '<td class="num">' + won(r.cost) + '</td><td class="num">' + won(r.rev) + "</td>" +
        '<td class="num"><b>' + (isFinite(r.roas) ? pct(r.roas, 0) : "∞") + "</b></td>" +
        '<td class="num">' + pct(ctr, 2) + '</td><td class="num">' + pct(cvr, 2) + "</td>" +
        '<td class="num">' + Math.round(cpc).toLocaleString("ko-KR") + "</td><td>" + pill + "</td></tr>";
    }).join("");
  }

  function updateSimulator() {
    const box = $("#simOut");
    if (!box) return;
    const cost = numOrNull("simCost"), cpc = numOrNull("simCpc"), cvr = numOrNull("simCvr");
    const net = state.net;
    const rows = [];
    rows.push(["내 상품 건당 순이익", won(net) + " <span class='small'>" + (byId[state.productId] ? esc(byId[state.productId].name) : "선택 상품") + "</span>"]);
    rows.push(["손익분기 CPA (주문 1건당 광고비)", net > 0 ? won(net) : '<span style="color:#dc2626">적자 — 광고 불가</span>']);
    if (cvr && cvr > 0) rows.push(["손익분기 CPC", net > 0 ? won(net * cvr / 100) : "—"]);
    if (cost !== null && cpc && cpc > 0) {
      const clicks = cost / cpc;
      const orders = clicks * ((cvr || 0) / 100);
      const revenue = orders * state.price;
      const adProfit = revenue - cost - orders * (state.supply + state.feeRate / 100 * state.price + state.cfs);
      rows.push(["예상 클릭", Math.round(clicks).toLocaleString("ko-KR") + "회"]);
      rows.push(["예상 주문", orders.toFixed(1) + "건"]);
      rows.push(["예상 ROAS", cost > 0 ? pct(revenue / cost * 100, 1) : "—"]);
      rows.push(["광고 후 순이익(예상)", won(adProfit)]);
    }
    box.innerHTML = rows.map((r) => '<tr><td class="small">' + r[0] + "</td><td class='num'><b>" + r[1] + "</b></td></tr>").join("") +
      '<tr><td colspan="2" class="note">예상 클릭·주문은 입력한 CPC·전환율로 계산한 추정치입니다. 실제 성과는 보고서 업로드로 확인하세요.</td></tr>';
  }

  function initAd() {
    const goal = $("#aGoal"), cut = $("#aCut");
    const sync = () => {
      $("#aGoalVal").textContent = goal.value + "%";
      $("#aCutVal").textContent = cut.value + "%";
      if (adState.rows.length) analyzeAd();
    };
    goal.addEventListener("input", sync); cut.addEventListener("input", sync);
    $("#aCutFromMargin").addEventListener("click", () => {
      if (!state.margin || state.margin <= 0) { toast("소싱 계산기 마진이 0 이하입니다"); return; }
      const v = clamp(Math.round((100 / (state.margin / 100)) / 5) * 5, 100, 900);
      cut.value = v; $("#aCutVal").textContent = v + "%";
      toast("실마진 " + state.margin.toFixed(1) + "% 기준 커트라인 " + v + "%");
      if (adState.rows.length) analyzeAd();
    });
    const fileEl = $("#aFile");
    $("#aDrop").addEventListener("click", () => fileEl.click());
    $("#aDrop").addEventListener("dragover", (e) => { e.preventDefault(); $("#aDrop").classList.add("over"); });
    $("#aDrop").addEventListener("dragleave", () => $("#aDrop").classList.remove("over"));
    $("#aDrop").addEventListener("drop", (e) => {
      e.preventDefault(); $("#aDrop").classList.remove("over");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readFile(f);
    });
    fileEl.addEventListener("change", () => { if (fileEl.files[0]) readFile(fileEl.files[0]); });
    function readFile(f) {
      const reader = new FileReader();
      reader.onload = () => {
        $("#aPaste").value = String(reader.result || "");
        adState.source = f.name;
        toast(f.name + " 불러왔습니다");
        analyzeAd();
      };
      reader.readAsText(f, "utf-8");
    }
    $("#aTemplate").addEventListener("click", () => {
      $("#aPaste").value = "키워드\t노출수\t클릭수\t광고비\t주문수\t전환매출\n";
      toast("머리글을 넣었습니다. 광고센터 표를 그대로 붙여넣으세요");
    });
    $("#aRun").addEventListener("click", analyzeAd);
    $("#aClear").addEventListener("click", () => {
      $("#aPaste").value = ""; $("#aFile").value = ""; adState.rows = [];
      $("#aStatus").textContent = "인식된 컬럼: — / 0행";
      $("#aTable").innerHTML = '<tr><td colspan="8" class="note">분석 전입니다.</td></tr>';
      $("#aDiagBody").innerHTML = '<tr><td class="note">보고서를 올리고 분석을 실행하세요.</td></tr>';
      $("#aActions").innerHTML = '<li class="note">분석 후 데이터에 맞춰 생성됩니다.</li>';
      $("#aNegList").textContent = "보고서를 분석하면 여기에 표시됩니다.";
      $("#aDiagBadge").textContent = "대기"; $("#aDiagBadge").className = "right badge gray";
      $("#aDiagNote").textContent = "분석 전입니다. 업로드한 광고 보고서만으로 진단합니다.";
      $("#aDiagNote").className = "callout info";
      ["cntDrop", "cntWatch", "cntBoost", "cntKeep"].forEach((id) => { $("#" + id).textContent = "0"; });
    });
    $("#aNegCopy").addEventListener("click", () => {
      const t = $("#aNegList").textContent.trim();
      if (!t || t.indexOf("보고서") === 0) { toast("먼저 분석을 실행하세요"); return; }
      copyText(t, "부정키워드 " + t.split("\n").filter(Boolean).length + "개를 복사했습니다");
    });
    $$("#aTabs button").forEach((b) => b.addEventListener("click", () => {
      adState.bucket = b.dataset.bucket;
      $$("#aTabs button").forEach((x) => x.classList.toggle("active", x === b));
      renderAdTable();
    }));
    ["simCost", "simCpc", "simCvr"].forEach((id) => $("#" + id).addEventListener("input", updateSimulator));
    $("#btnSaveAd").addEventListener("click", () => {
      if (!adState.rows.length || !adState.total) { toast("먼저 보고서를 분석하세요"); return; }
      const t = adState.total;
      window.HSStore.add({
        type: "ad", title: "광고 " + adState.rows.length + "키워드 · ROAS " + (t.cost > 0 ? (t.rev / t.cost * 100).toFixed(0) : 0) + "%",
        data: {
          rows: adState.rows.length, cost: Math.round(t.cost), revenue: Math.round(t.rev),
          roas: +(t.cost > 0 ? t.rev / t.cost * 100 : 0).toFixed(1), cut: num("aCut"), goal: num("aGoal"),
          drops: adState.rows.filter((r) => r.bucket === "drop").map((r) => r.kw).slice(0, 50),
          source: adState.source || "붙여넣기"
        }
      });
      toast("분석을 저장했습니다");
    });
    updateSimulator();
  }

  window.HS = {
    $, $$, DB, won, pct, num, numOrNull, esc, clamp, toast, copyText, parseNumber,
    parseDate, fmtDate, addDays, dday, nextEvents, state, byId, applyProduct,
    parseReport, categoryLabel: (id) => (FEE[id] || {}).label || ""
  };

  document.addEventListener("DOMContentLoaded", () => {
    initSourcing();
    initAd();
    const hash = (location.hash || "").replace("#", "");
    if (hash && document.getElementById("view-" + hash)) setView(hash);
  });
})();
