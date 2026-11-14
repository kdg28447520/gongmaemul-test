/* 동곤 헬프스토어 PRO — all8: 소싱 큐 · 프리셋 일괄가공 · 이미지 스튜디오 · 8대 마켓 */
(function () {
  "use strict";
  const HS = window.HS;
  if (!HS) return;
  const { $, $$, esc, toast, copyText, won } = HS;

  const KQ = "hs_all8_queue_v1";
  const KP = "hs_all8_preset_v1";
  const KM = "hs_all8_market_v1";
  const KR = "hs_all8_rules_v1";
  const KIMG = "hs_all8_img_v1";

  const rd = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v === null ? d : v; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const stamp = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()); };
  const nz = (v, d) => { const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(/[^0-9.\-]/g, "")); return isFinite(n) ? n : d; };
  const csvCell = (v) => '"' + String(v === undefined || v === null ? "" : v).replace(/"/g, '""') + '"';
  const byteLen = (s) => { let n = 0; for (const ch of s) n += ch.charCodeAt(0) > 127 ? 2 : 1; return n; };
  const chars = (s) => Array.from(s).length;
  const roundTo = (v, u) => { const u2 = u > 0 ? u : 1; return Math.round(v / u2) * u2; };
  const short = (s, n) => { const a = String(s === null || s === undefined ? "" : s); return a.length > n ? a.slice(0, n) + "…" : a; };

  /* ── 실측 시드: materials/rocketgrowth_private_candidates_2026-11-14.md ──
     마진율은 자료의 '제안 판매가'를 이 화면의 공식(원가×환율×(1+마진율)+배송비)으로 역산한 값이다. */
  const SEED_SRC = "materials/rocketgrowth_private_candidates_2026-11-14.md · 바나나B2B 실단가 ↔ 쿠팡 1:1 대조 (조회 2026-11-14 18:10~18:25)";
  const SEED = [
    { id: "s1", name: "원터치 원형 쓰레기통 인테리어 우드 7L", url: "https://bananab2b.shop/product/590729",
      cost: 5940, ship: 100, margin: 132.32, img: "assets/p1.jpg", vendor: "바나나B2B · 590729",
      refPrice: 15030, refName: "구디푸디 원목 스타일 원터치 10L · 리뷰 834 · 로켓 없음(3P)",
      memo: "제안 판매가 13,900원. 30개 사입 시 배송비 개당 100원. 쿠팡 동일 디자인이 3P로만 15,030원." },
    { id: "s2", name: "차량용 메모리폼 목쿠션", url: "https://bananab2b.shop/product/585860",
      cost: 6500, ship: 300, margin: 140, img: "assets/p2.jpg", vendor: "바나나B2B · 585860",
      refPrice: 17940, refName: "카템 감탄 3D 메모리폼 차량용 등쿠션 · 리뷰 302",
      memo: "제안 판매가 15,900원. 12개마다 배송비 3,000원 → 개당 300원. 브랜드명(카템) 사용 금지." },
    { id: "s3", name: "욕실 모서리 선반 이동식 트롤리 3단", url: "https://bananab2b.shop/product/1029402",
      cost: 6380, ship: 100, margin: 194.67, img: "assets/p3.jpg", vendor: "바나나B2B · 1029402",
      refPrice: 18430, refName: "비아베네또 이동식 트롤리 틈새 선반 · 리뷰 1,187",
      memo: "제안 판매가 18,900원(중형 물류 3,400원 보수 적용 시 마진 30.0%). 플라스틱 경량형 명시 필요." },
    { id: "s4", name: "강아지 이동가방 방수 백팩", url: "https://bananab2b.shop/product/1061116",
      cost: 9500, ship: 100, margin: 108.42, img: "assets/p4.jpg", vendor: "바나나B2B · 1061116",
      refPrice: 19900, refName: "코지스 강아지 백팩 이동장 · 리뷰 617",
      memo: "제안 판매가 19,900원. 접었을 때 소형 구간(가로+세로+높이) 실측 필수." },
    { id: "s5", name: "메모리폼 도넛 방석 꼬리뼈 쿠션", url: "https://bananab2b.shop/product/1027417",
      cost: 10450, ship: 100, margin: 99.04, img: "assets/p5.jpg", vendor: "바나나B2B · 1027417",
      refPrice: 19770, refName: "라멜리 메모리폼 꼬리뼈 도넛 방석 · 리뷰 439",
      memo: "제안 판매가 20,900원이어야 마진 20% 통과(19,900원은 19.2%로 미달)." }
  ];

  /* ── 8대 마켓 정의 ── */
  const MARKETS = [
    { id: "coupang", short: "쿠팡", name: "쿠팡 (윙)", nameMax: 100, byteMax: 0, noAd: true,
      cols: ["등록상품명", "노출상품명", "카테고리코드", "판매가", "재고수량", "배송방법", "대표이미지", "고시정보", "상품URL"],
      rule: "노출상품명 최대 100자(2024-04-03 150→100). 상품명에 배송·광고 문구·특수문자 금지.",
      src: "쿠팡 Open API 공지 2024-03-27" },
    { id: "naver", short: "네이버", name: "네이버 스마트스토어", nameMax: 100, byteMax: 0, noAd: true,
      cols: ["상품명", "카테고리", "판매가", "재고수량", "배송비", "대표이미지", "고시정보", "원산지", "상품URL"],
      rule: "상품명 최대 100자(50자 내외 권장). 혜택 정보는 상품명 대신 혜택 조건 탭에 입력.",
      src: "네이버 커머스 아카데미" },
    { id: "gmarket", short: "G마켓", name: "G마켓 (ESM+)", nameMax: 0, byteMax: 100, noAd: false,
      cols: ["상품명(검색용)", "상품명(프로모션용)", "카테고리코드", "판매가", "재고수량", "배송비", "대표이미지", "고시정보"],
      rule: "검색용+프로모션용 합계 100byte — 한글 50자 / 영숫자 100자.",
      src: "ESM+ 판매자 가이드 2.0" },
    { id: "auction", short: "옥션", name: "옥션 (ESM+)", nameMax: 0, byteMax: 100, noAd: false,
      cols: ["상품명(검색용)", "상품명(프로모션용)", "카테고리코드", "판매가", "재고수량", "배송비", "대표이미지", "고시정보"],
      rule: "검색용+프로모션용 합계 100byte — 한글 50자 / 영숫자 100자.",
      src: "ESM+ 판매자 가이드 2.0" },
    { id: "eleven", short: "11번가", name: "11번가", nameMax: 100, byteMax: 0, noAd: false,
      cols: ["상품명", "카테고리", "판매가", "재고수량", "배송비", "대표이미지", "고시정보", "상품URL"],
      rule: "상품명 최대 100자. 카테고리·고시정보 필수.",
      src: "판매자센터 등록 화면 기준(정책 변동 가능)" },
    { id: "eleven_g", short: "11번가 글로벌", name: "11번가 글로벌", nameMax: 100, byteMax: 0, noAd: false, global: true,
      cols: ["상품명(영문)", "상품명(국문)", "HS코드", "원산지", "판매가(KRW)", "재고수량", "대표이미지", "상품URL"],
      rule: "해외 배송 상품은 HS코드·원산지·영문 상품명이 필요합니다.",
      src: "판매자센터 해외배송 등록 항목" },
    { id: "lotteon", short: "롯데ON", name: "롯데ON", nameMax: 100, byteMax: 0, noAd: true,
      cols: ["브랜드", "상품명", "카테고리", "판매가", "재고수량", "대표이미지", "고시정보"],
      rule: "상품명 = 브랜드+제품명+상품군. 홍보문구·브랜드명 중복 입력 금지, 허용 특수기호 제한.",
      src: "롯데ON 상품명 가이드" },
    { id: "toss", short: "토스쇼핑", name: "토스쇼핑", nameMax: 100, byteMax: 0, noAd: false,
      chars: /^[0-9a-zA-Z가-힣 ()\-·[\]/&+,~.*_#]$/,
      cols: ["상품명", "카테고리", "판매가", "재고수량", "대표이미지", "상세설명", "상품URL"],
      rule: "상품명 1~100자. 허용 특수문자 ( ) - · [ ] / & + , ~ . * _ # 만 사용(@ ! % $ 불가).",
      src: "토스쇼핑 API 문서" }
  ];
  const mkById = {};
  MARKETS.forEach((m) => { mkById[m.id] = m; });

  const BAN = ["무료배송", "무료 배송", "당일출고", "당일배송", "최저가", "최고", "1위", "베스트", "완벽", "유일", "특가", "할인", "이벤트", "무조건", "정품보장"];

  /* ── 상태 ── */
  let queue = [];
  let preset = { prefix: "", maxLen: 40, fx: 1, margin: 100, round: 100 };
  let mkt = { cats: {}, notice: "", origin: "", hs: "", brand: "", sel: "coupang" };
  let rules = {};
  let editing = null;
  let imgOk = false;
  let selMarkets = MARKETS.map((m) => m.id);

  const studio = {
    img: null, label: "",
    white: true, maskOn: false, maskX: 6, maskY: 64, maskW: 88, maskH: 26, maskColor: "#ffffff",
    badge: { text: "", pos: "bc", size: 44, bg: "#4f46e5", fg: "#ffffff" }
  };
  const SDEF = { white: true, maskOn: false, maskX: 6, maskY: 64, maskW: 88, maskH: 26, maskColor: "#ffffff", badge: { text: "", pos: "bc", size: 44, bg: "#4f46e5", fg: "#ffffff" } };

  /* ── 계산 ── */
  function finalName(it) {
    const raw = String(preset.prefix || "") + it.name;
    const cut = Array.from(raw).slice(0, Math.max(4, preset.maxLen)).join("");
    return cut.replace(/\s+$/, "");
  }
  function priceOf(it) {
    const cost = nz(it.cost, 0) * (nz(preset.fx, 1) || 1);
    const raw = cost * (1 + nz(it.margin, 0) / 100) + nz(it.ship, 0);
    return roundTo(raw, nz(preset.round, 100));
  }
  function verdictOf(it) {
    const p = priceOf(it);
    if (!p) return { lv: "bad", text: "판매가 미산정" };
    if (p < 12000) return { lv: "warn", text: "12,000원 미만 · 로켓 고정비 주의" };
    if (it.refPrice && p >= it.refPrice) return { lv: "warn", text: "대조가(" + won(it.refPrice) + ") 이상" };
    if (it.refPrice) return { lv: "ok", text: "대조가 -" + won(it.refPrice - p) };
    return { lv: "ok", text: "가격 규칙 통과" };
  }

  /* ── 저장/불러오기 ── */
  function loadAll() {
    const q = rd(KQ, null);
    queue = (q && Array.isArray(q.items)) ? q.items : SEED.map((x) => Object.assign({}, x));
    if (!q) wr(KQ, { items: queue });

    preset = Object.assign({ prefix: "", maxLen: 40, fx: 1, margin: 100, round: 100 }, rd(KP, {}) || {});

    mkt = Object.assign({ cats: {}, notice: "", origin: "", hs: "", brand: "", sel: "coupang" }, rd(KM, {}) || {});
    if (!mkt.cats || typeof mkt.cats !== "object") mkt.cats = {};

    const saved = rd(KR, {}) || {};
    rules = {};
    MARKETS.forEach((m) => {
      rules[m.id] = Object.assign({ nameMax: m.nameMax, byteMax: m.byteMax || 0 }, saved[m.id] || {});
    });

    imgOk = rd(KIMG, false) === true;
    if (MARKETS.every((m) => m.id !== mkt.sel)) mkt.sel = "coupang";
  }
  const saveQueue = () => wr(KQ, { items: queue });
  const savePreset = () => wr(KP, preset);
  const saveMkt = () => wr(KM, mkt);
  const saveRules = () => wr(KR, rules);

  /* ══════════════════════════════════════════
     ① 소싱 큐 · 프리셋
     ══════════════════════════════════════════ */
  function syncChips() {
    const cur = (document.getElementById("a8Prefix") || {}).value || "";
    $$(".preset-row .chip[data-prefix]").forEach((b) => b.classList.toggle("on", b.dataset.prefix === cur));
  }
  function writePresetInputs() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set("a8Prefix", preset.prefix);
    set("a8MaxLen", preset.maxLen);
    set("a8Fx", preset.fx);
    set("a8Margin", preset.margin);
    set("a8Round", String(preset.round));
    syncChips();
    updateFormulaDemo();
  }
  function readPresetInputs() {
    return {
      prefix: (document.getElementById("a8Prefix") || {}).value || "",
      maxLen: Math.max(4, Math.min(100, nz((document.getElementById("a8MaxLen") || {}).value, 40))),
      fx: Math.max(0.01, nz((document.getElementById("a8Fx") || {}).value, 1)),
      margin: Math.max(0, nz((document.getElementById("a8Margin") || {}).value, 100)),
      round: nz((document.getElementById("a8Round") || {}).value, 100)
    };
  }
  function draftDirty() {
    const d = readPresetInputs();
    return d.prefix !== preset.prefix || d.maxLen !== preset.maxLen || d.fx !== preset.fx || d.margin !== preset.margin || d.round !== preset.round;
  }
  function updateFormulaDemo() {
    const el = document.getElementById("a8FormulaDemo");
    if (!el) return;
    const d = readPresetInputs();
    const base = queue[0] || { cost: 5940, ship: 100, margin: 132.32 };
    const demo = Math.round(nz(base.cost, 0) * d.fx * (1 + nz(base.margin, 0) / 100) + nz(base.ship, 0));
    el.textContent = won(roundTo(demo, d.round)) + " (" + d.maxLen + "자 컷)";
  }

  function renderQueue() {
    const body = document.getElementById("a8QueueBody");
    if (!body) return;
    document.getElementById("a8QueueCount").textContent = queue.length + "개";
    if (!queue.length) {
      body.innerHTML = '<tr><td colspan="8" class="note">큐가 비었습니다. 왼쪽에서 상품을 추가하거나 ‘실측 5선 복원’을 누르세요.</td></tr>';
      return;
    }
    body.innerHTML = queue.map((it) => {
      const p = priceOf(it);
      const nm = finalName(it);
      const v = verdictOf(it);
      const sub = [];
      if (it.vendor) sub.push(esc(it.vendor));
      if (it.refName) sub.push("쿠팡 " + esc(short(it.refName, 26)) + " " + won(it.refPrice));
      return '<tr>' +
        '<td><b>' + esc(it.name) + "</b>" +
          (it.url ? '<br><a href="' + esc(it.url) + '" target="_blank" rel="noopener" class="small">상품 페이지</a>' : "") +
          (sub.length ? '<br><span class="small">' + sub.join(" · ") + "</span>" : "") +
          (it.memo ? '<br><span class="small" title="' + esc(it.memo) + '">' + esc(short(it.memo, 84)) + "</span>" : "") +
        "</td>" +
        '<td class="num">' + won(it.cost) + "</td>" +
        '<td class="num">' + won(it.ship) + "</td>" +
        '<td class="num">' + (nz(it.margin, 0)).toFixed(1) + "%</td>" +
        '<td class="num"><b>' + won(p) + "</b></td>" +
        "<td>" + esc(nm) + ' <span class="small">' + chars(nm) + "자</span></td>" +
        '<td><span class="pill-mini ' + v.lv + '">' + esc(v.text) + "</span></td>" +
        '<td><div class="strip" style="gap:4px;flex-wrap:nowrap">' +
          '<button class="btn sm" data-edit="' + it.id + '" type="button">수정</button>' +
          (it.img ? '<button class="btn sm ghost" data-img="' + it.id + '" type="button">이미지</button>' : "") +
          '<button class="btn sm ghost" data-del="' + it.id + '" type="button">삭제</button>' +
        "</div></td></tr>";
    }).join("");

    $$("[data-edit]", body).forEach((b) => b.addEventListener("click", () => startEdit(b.dataset.edit)));
    $$("[data-del]", body).forEach((b) => b.addEventListener("click", () => removeItem(b.dataset.del)));
    $$("[data-img]", body).forEach((b) => b.addEventListener("click", () => {
      const it = queue.find((x) => x.id === b.dataset.img);
      if (it && it.img) { showPane("studio"); loadImg(it.img, it.name); }
    }));
  }

  function startEdit(id) {
    const it = queue.find((x) => x.id === id);
    if (!it) return;
    editing = id;
    const set = (i, v) => { const el = document.getElementById(i); if (el) el.value = v === undefined || v === null ? "" : v; };
    set("a8Name", it.name); set("a8Url", it.url); set("a8Cost", it.cost); set("a8Ship", it.ship);
    set("a8ItemMargin", it.margin); set("a8Memo", it.memo);
    document.getElementById("a8FormTitle").textContent = "상품 수정";
    document.getElementById("a8FormMode").textContent = "수정 중 · " + it.name.slice(0, 14);
    document.getElementById("a8EditSave").disabled = false;
    document.getElementById("a8EditCancel").disabled = false;
    document.getElementById("a8Add").disabled = true;
    document.getElementById("a8FormCard").scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function endEdit() {
    editing = null;
    ["a8Name", "a8Url", "a8Cost", "a8Ship", "a8ItemMargin", "a8Memo"].forEach((i) => { const el = document.getElementById(i); if (el) el.value = ""; });
    document.getElementById("a8FormTitle").textContent = "상품 추가";
    document.getElementById("a8FormMode").textContent = "새 항목";
    document.getElementById("a8EditSave").disabled = true;
    document.getElementById("a8EditCancel").disabled = true;
    document.getElementById("a8Add").disabled = false;
    document.getElementById("a8FormNote").textContent = "실측 5선은 바나나B2B 실단가와 쿠팡 1:1 대조값입니다. 새 상품은 이 기기에만 저장됩니다.";
  }
  const normName = (s) => String(s || "").replace(/\s+/g, "").replace(/^\[[^\]]*\]/, "").toLowerCase();

  function readForm() {
    return {
      name: (document.getElementById("a8Name") || {}).value || "",
      url: (document.getElementById("a8Url") || {}).value || "",
      cost: nz((document.getElementById("a8Cost") || {}).value, 0),
      ship: nz((document.getElementById("a8Ship") || {}).value, 0),
      margin: nz((document.getElementById("a8ItemMargin") || {}).value, preset.margin),
      memo: (document.getElementById("a8Memo") || {}).value || ""
    };
  }

  function addItem() {
    const f = readForm();
    f.name = f.name.trim();
    if (!f.name) { toast("상품명을 입력하세요"); return; }
    if (!f.cost) { toast("도매원가를 입력하세요"); return; }
    if (queue.some((x) => normName(x.name) === normName(f.name))) {
      toast("이미 큐에 있는 상품명입니다: " + f.name.slice(0, 20));
      return;
    }
    queue.push(Object.assign({ id: "u" + Date.now().toString(36), vendor: "직접 입력", source: "사용자 입력" }, f));
    saveQueue();
    endEdit();
    renderAll();
    toast("큐에 추가했습니다 (" + queue.length + "개)");
  }

  function saveEdit() {
    const it = queue.find((x) => x.id === editing);
    if (!it) { endEdit(); return; }
    const f = readForm();
    f.name = f.name.trim();
    if (!f.name) { toast("상품명을 입력하세요"); return; }
    if (queue.some((x) => x.id !== it.id && normName(x.name) === normName(f.name))) {
      toast("다른 항목과 상품명이 겹칩니다");
      return;
    }
    Object.assign(it, f);
    saveQueue();
    endEdit();
    renderAll();
    toast("수정했습니다");
  }

  function removeItem(id) {
    const it = queue.find((x) => x.id === id);
    if (!it) return;
    if (!confirm("‘" + it.name + "’을(를) 큐에서 삭제할까요?")) return;
    queue = queue.filter((x) => x.id !== id);
    saveQueue();
    renderAll();
    toast("삭제했습니다");
  }

  function applyPreset() {
    const prev = queue.map((it) => ({ id: it.id, name: finalName(it), price: priceOf(it) }));
    preset = readPresetInputs();
    savePreset();
    const before = prev;
    // 프리셋이 반영된 뒤 값을 다시 계산한다
    queue.forEach((it) => { it.updatedAt = new Date().toISOString(); });
    saveQueue();
    renderAll();
    const rows = queue.map((it) => {
      const prevRow = prev.find((b) => b.id === it.id) || { name: "", price: 0 };
      const nm = finalName(it);
      const p = priceOf(it);
      const diff = [];
      if (prevRow.name !== nm) diff.push("상품명");
      if (prevRow.price !== p) diff.push("판매가 " + won(prevRow.price) + " → " + won(p));
      return { it, nm, p, diff: diff.join(" · ") || "변경 없음" };
    });
    const changed = rows.filter((r) => r.diff !== "변경 없음").length;
    const badge = document.getElementById("a8ApplyBadge");
    badge.textContent = changed + "건 변경 / " + rows.length + "건";
    badge.className = "right badge " + (changed ? "ok" : "gray");
    document.getElementById("a8ApplyBody").innerHTML = rows.map((r) =>
      "<tr><td>" + esc(r.it.name) + "</td><td>" + esc(r.nm) + '</td><td class="num">' + chars(r.nm) +
      '</td><td class="num">' + won(r.p) + "</td><td>" + (r.diff === "변경 없음" ? '<span class="pill-mini gray">변경 없음</span>' : '<span class="pill-mini ok">' + esc(r.diff) + "</span>") + "</td></tr>"
    ).join("");
    toast(changed ? "프리셋을 " + rows.length + "건에 일괄 적용했습니다 (" + changed + "건 변경)" : "프리셋 적용 완료 — 바뀐 값은 없습니다");
  }

  function marginAll() {
    const d = readPresetInputs();
    const m = d.margin;
    preset.margin = m;
    queue.forEach((it) => { it.margin = m; });
    savePreset();
    saveQueue();
    renderAll();
    toast("큐 " + queue.length + "건의 마진율을 " + m + "%로 맞췄습니다");
  }

  function restoreSeed() {
    if (!confirm("실측 5선으로 큐를 되돌립니다. 직접 넣은 항목은 사라집니다. 계속할까요?")) return;
    queue = SEED.map((x) => Object.assign({}, x));
    saveQueue();
    renderAll();
    toast("실측 5선을 복원했습니다");
  }

  function queueCsv() {
    const rows = [["상품명", "도매몰", "도매원가", "배송비", "마진율", "계산판매가", "최종상품명", "쿠팡대조가", "판정", "URL"]];
    queue.forEach((it) => rows.push([it.name, it.vendor || "", it.cost, it.ship, nz(it.margin, 0), priceOf(it), finalName(it), it.refPrice || "", verdictOf(it).text, it.url || ""]));
    saveBlob(new Blob(["\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" }), "all8_queue_" + stamp() + ".csv");
    toast("큐 CSV를 내보냈습니다 (" + queue.length + "행)");
  }

  /* ══════════════════════════════════════════
     ② 이미지 스튜디오
     ══════════════════════════════════════════ */
  function renderSamples() {
    const box = document.getElementById("a8Samples");
    if (!box) return;
    const withImg = queue.filter((x) => x.img);
    box.innerHTML = withImg.map((it) =>
      '<button class="a8-sample" data-sample="' + it.id + '" type="button"><img src="' + esc(it.img) + '" alt=""><span>' + esc(it.name.slice(0, 16)) + "</span></button>"
    ).join("") || '<p class="note">큐에 실측 이미지가 없습니다. 파일을 올려 주세요.</p>';
    $$("[data-sample]", box).forEach((b) => b.addEventListener("click", () => {
      const it = queue.find((x) => x.id === b.dataset.sample);
      if (!it) return;
      $$("[data-sample]", box).forEach((x) => x.classList.toggle("on", x === b));
      loadImg(it.img, it.name);
      if (!studio.badge.text) {
        const el = document.getElementById("a8BadgeText");
        if (el && !el.value) { el.value = it.name.slice(0, 18); studio.badge.text = el.value; renderStudio(); }
      }
    }));
  }

  function loadImg(src, label) {
    const img = new Image();
    img.onload = () => {
      studio.img = img;
      studio.label = label || "";
      const note = document.getElementById("a8ImgNote");
      if (note) note.innerHTML = "<b>" + esc(label || "업로드 이미지") + "</b> · " + img.naturalWidth + "×" + img.naturalHeight + "px · 서버 전송 없음";
      renderStudio();
    };
    img.onerror = () => toast("이미지를 불러오지 못했습니다");
    img.src = src;
  }

  function drawContain(ctx, img, ratio) {
    const box = 1000 * ratio;
    const s = Math.min(box / img.naturalWidth, box / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (1000 - w) / 2, (1000 - h) / 2, w, h);
  }
  function drawPlaceholder(ctx) {
    ctx.save();
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 4; ctx.setLineDash([16, 12]);
    ctx.strokeRect(26, 26, 948, 948);
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "800 42px Pretendard, 'Malgun Gothic', sans-serif";
    ctx.fillText("이미지를 불러오세요", 500, 470);
    ctx.font = "600 26px Pretendard, 'Malgun Gothic', sans-serif";
    ctx.fillText("1000 × 1000 · 흰 배경 · 중앙 80%", 500, 530);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
  function drawBadge(ctx) {
    const text = String(studio.badge.text || "").trim();
    if (!text) return;
    const fam = "Pretendard, 'Malgun Gothic', sans-serif";
    let size = Math.max(16, nz(studio.badge.size, 44));
    ctx.font = "800 " + size + "px " + fam;
    let tw = ctx.measureText(text).width;
    const maxW = 880;
    if (tw > maxW) {
      size = Math.max(16, Math.floor(size * maxW / tw));
      ctx.font = "800 " + size + "px " + fam;
      tw = ctx.measureText(text).width;
    }
    const padX = Math.round(size * 0.55);
    const w = Math.min(960, tw + padX * 2);
    const h = Math.round(size * 1.9);
    const margin = 40;
    const pos = studio.badge.pos || "bc";
    let x, y;
    if (pos.charAt(0) === "t") y = margin;
    else if (pos.charAt(0) === "m") y = Math.round((1000 - h) / 2);
    else y = 1000 - margin - h;
    if (pos.charAt(1) === "l") x = margin;
    else if (pos.charAt(1) === "c") x = Math.round((1000 - w) / 2);
    else x = 1000 - margin - w;

    ctx.save();
    ctx.shadowColor = "rgba(15,23,42,.28)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
    ctx.fillStyle = studio.badge.bg || "#4f46e5";
    roundRect(ctx, x, y, w, h, Math.round(h / 2));
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = studio.badge.fg || "#ffffff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  }

  function renderStudio() {
    const cv = document.getElementById("a8Canvas");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1000, 1000);
    if (!studio.img) {
      drawPlaceholder(ctx);
    } else {
      drawContain(ctx, studio.img, studio.white ? 0.8 : 1);
      if (studio.maskOn) {
        const w = Math.max(0, Math.min(100, nz(studio.maskW, 0)));
        const h = Math.max(0, Math.min(100, nz(studio.maskH, 0)));
        const x = Math.max(0, Math.min(100, nz(studio.maskX, 0)));
        const y = Math.max(0, Math.min(100, nz(studio.maskY, 0)));
        ctx.fillStyle = studio.maskColor || "#ffffff";
        ctx.fillRect(x * 10, y * 10, Math.min(w, 100 - x) * 10, Math.min(h, 100 - y) * 10);
      }
      if (String(studio.badge.text || "").trim()) drawBadge(ctx);
    }
    const before = document.getElementById("a8CmpBefore");
    const after = document.getElementById("a8CmpAfter");
    if (before) {
      const b = before.getContext("2d");
      b.fillStyle = "#ffffff"; b.fillRect(0, 0, 1000, 1000);
      if (studio.img) drawContain(b, studio.img, 1); else drawPlaceholder(b);
    }
    if (after) {
      const a = after.getContext("2d");
      a.clearRect(0, 0, 1000, 1000);
      a.drawImage(cv, 0, 0);
    }
    applyCmp(nz((document.getElementById("a8CmpRange") || {}).value, 50));
  }

  function applyCmp(v) {
    const after = document.getElementById("a8CmpAfter");
    const line = document.getElementById("a8CmpLine");
    if (!after) return;
    const p = Math.max(0, Math.min(100, v));
    after.style.clipPath = "inset(0 0 0 " + p + "%)";
    if (line) line.style.left = p + "%";
  }

  function syncStudio() {
    const g = (id, d) => { const el = document.getElementById(id); return el ? el.value : d; };
    studio.white = !!(document.getElementById("a8White") || {}).checked;
    studio.maskOn = !!(document.getElementById("a8MaskOn") || {}).checked;
    studio.maskX = nz(g("a8MaskX", 6), 6);
    studio.maskY = nz(g("a8MaskY", 64), 64);
    studio.maskW = nz(g("a8MaskW", 88), 88);
    studio.maskH = nz(g("a8MaskH", 26), 26);
    studio.maskColor = g("a8MaskColor", "#ffffff");
    studio.badge.text = g("a8BadgeText", "");
    studio.badge.pos = g("a8BadgePos", "bc");
    studio.badge.size = nz(g("a8BadgeSize", 44), 44);
    studio.badge.bg = g("a8BadgeBg", "#4f46e5");
    studio.badge.fg = g("a8BadgeFg", "#ffffff");
  }
  function writeStudioInputs() {
    const set = (id, v) => { const el = document.getElementById(id); if (!el) return; if (el.type === "checkbox") el.checked = !!v; else el.value = v; };
    set("a8White", studio.white); set("a8MaskOn", studio.maskOn);
    set("a8MaskX", studio.maskX); set("a8MaskY", studio.maskY);
    set("a8MaskW", studio.maskW); set("a8MaskH", studio.maskH); set("a8MaskColor", studio.maskColor);
    set("a8BadgeText", studio.badge.text); set("a8BadgePos", studio.badge.pos); set("a8BadgeSize", studio.badge.size);
    set("a8BadgeBg", studio.badge.bg); set("a8BadgeFg", studio.badge.fg);
  }

  function downloadPng() {
    if (!studio.img) { toast("먼저 이미지를 불러오세요"); return; }
    syncStudio();
    renderStudio();
    const cv = document.getElementById("a8Canvas");
    const done = (b) => {
      if (!b) { toast("PNG 생성에 실패했습니다"); return; }
      saveBlob(b, "all8-main-1000x1000-" + stamp() + ".png");
      imgOk = true; wr(KIMG, true);
      renderMarkets();
      toast("1000×1000 PNG를 내보냈습니다 (8대 마켓 대표이미지 상태 반영)");
    };
    if (cv.toBlob) cv.toBlob(done, "image/png");
    else { const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "all8-main-1000x1000-" + stamp() + ".png"; a.click(); imgOk = true; wr(KIMG, true); renderMarkets(); }
  }

  /* ══════════════════════════════════════════
     ③ 8대 마켓
     ══════════════════════════════════════════ */
  function evalItem(it, m) {
    const r = rules[m.id] || { nameMax: m.nameMax, byteMax: m.byteMax || 0 };
    const nm = finalName(it);
    const pr = priceOf(it);
    const cat = String(mkt.cats[it.id + "|" + m.id] || "").trim();
    const notice = String(mkt.notice || "").trim();
    const out = [];

    if (r.byteMax) {
      const bl = byteLen(nm);
      out.push(bl > r.byteMax
        ? { k: "상품명 길이", lv: "bad", d: bl + "byte / " + r.byteMax + "byte 초과" }
        : { k: "상품명 길이", lv: "ok", d: bl + "byte / " + r.byteMax + "byte" });
    } else {
      const L = chars(nm);
      out.push(L > r.nameMax
        ? { k: "상품명 길이", lv: "bad", d: L + "자 / " + r.nameMax + "자 초과" }
        : { k: "상품명 길이", lv: "ok", d: L + "자 / " + r.nameMax + "자" });
    }

    if (m.noAd) {
      const hit = BAN.filter((w) => nm.indexOf(w) >= 0);
      out.push(hit.length
        ? { k: "금지 문구", lv: "bad", d: "상품명에 ‘" + hit.join("·") + "’ 사용 불가" }
        : { k: "금지 문구", lv: "ok", d: "배송·광고 문구 없음" });
    }
    if (m.chars) {
      const badChars = Array.from(nm).filter((c) => !m.chars.test(c));
      out.push(badChars.length
        ? { k: "허용 특수문자", lv: "bad", d: "‘" + Array.from(new Set(badChars)).join(" ") + "’ 사용 불가" }
        : { k: "허용 특수문자", lv: "ok", d: "허용 문자만 사용" });
    }

    out.push(cat ? { k: "카테고리", lv: "ok", d: cat } : { k: "카테고리", lv: "bad", d: "이 마켓 카테고리 코드 미입력" });
    if (!notice) out.push({ k: "고시정보", lv: "bad", d: "공통 고시정보 미입력" });
    else if (notice.indexOf("확인 필요") >= 0) out.push({ k: "고시정보", lv: "warn", d: "‘확인 필요’ 항목이 남아 있음" });
    else out.push({ k: "고시정보", lv: "ok", d: "입력 완료" });

    if (!pr) out.push({ k: "판매가", lv: "bad", d: "미산정" });
    else if (pr < 12000) out.push({ k: "판매가", lv: "warn", d: won(pr) + " · 12,000원 미만이면 로켓 고정비로 실마진 없음" });
    else out.push({ k: "판매가", lv: "ok", d: won(pr) });

    out.push(imgOk
      ? { k: "대표이미지", lv: "ok", d: "1000×1000 PNG 내보냄" }
      : { k: "대표이미지", lv: "warn", d: "이미지 스튜디오에서 아직 내보내지 않음" });

    if (m.global) {
      out.push(String(mkt.hs || "").trim() ? { k: "HS코드", lv: "ok", d: mkt.hs } : { k: "HS코드", lv: "bad", d: "미입력" });
      out.push(String(mkt.origin || "").trim() ? { k: "원산지", lv: "ok", d: mkt.origin } : { k: "원산지", lv: "bad", d: "미입력" });
      out.push(/[A-Za-z]{2,}/.test(nm) ? { k: "영문 상품명", lv: "ok", d: "영문 포함" } : { k: "영문 상품명", lv: "warn", d: "영문 상품명 미입력" });
    }

    const bad = out.filter((c) => c.lv === "bad");
    const warn = out.filter((c) => c.lv === "warn");
    const lv = bad.length ? "bad" : (warn.length ? "warn" : "ok");
    return {
      lv, checks: out,
      label: lv === "bad" ? "수정 필요" : lv === "warn" ? "보완 권장" : "정상",
      reasons: (bad.concat(warn)).map((c) => c.k + " — " + c.d).join(" / ") || "모든 필수값 통과"
    };
  }

  function matrixCounts() {
    let ok = 0, warn = 0, bad = 0;
    queue.forEach((it) => MARKETS.forEach((m) => {
      const s = evalItem(it, m);
      if (s.lv === "ok") ok++; else if (s.lv === "warn") warn++; else bad++;
    }));
    return { ok: ok, warn: warn, bad: bad };
  }
  function updateMatrixCounts() {
    const c = matrixCounts();
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set("a8CntOk", "정상 " + c.ok); set("a8CntWarn", "보완 " + c.warn); set("a8CntBad", "수정 " + c.bad);
  }

  function renderMatrix() {
    const head = document.getElementById("a8MatrixHead");
    const body = document.getElementById("a8MatrixBody");
    if (!head || !body) return;
    head.innerHTML = "<tr><th>상품 · 판매가</th>" + MARKETS.map((m) =>
      '<th><span style="display:block">' + esc(m.short) + '</span><button class="btn sm ghost" data-csvm="' + m.id + '" type="button" style="margin-top:4px">CSV</button></th>'
    ).join("") + "</tr>";
    body.innerHTML = queue.map((it) =>
      "<tr><td><b>" + esc(finalName(it)) + '</b><br><span class="small">' + won(priceOf(it)) + "</span></td>" +
      MARKETS.map((m) => {
        const s = evalItem(it, m);
        return '<td data-cell="' + esc(it.id + "|" + m.id) + '"><span class="pill-mini ' + s.lv + '" data-jump="' + m.id + '" title="' + esc(s.reasons) + '">' + s.label + "</span></td>";
      }).join("") + "</tr>"
    ).join("") || '<tr><td colspan="9" class="note">큐가 비었습니다.</td></tr>';

    updateMatrixCounts();
    $$("[data-csvm]", head).forEach((b) => b.addEventListener("click", () => exportOne(b.dataset.csvm)));
    $$("[data-jump]", body).forEach((b) => b.addEventListener("click", () => { selectMarket(b.dataset.jump); document.getElementById("a8MarketBody").scrollIntoView({ behavior: "smooth", block: "center" }); }));
  }

  function fillMarketSelect() {
    const sel = document.getElementById("a8MarketSel");
    if (!sel) return;
    sel.innerHTML = MARKETS.map((m) => '<option value="' + m.id + '">' + esc(m.name) + "</option>").join("");
    sel.value = mkt.sel;
  }

  function selectMarket(id) {
    if (!mkById[id]) return;
    mkt.sel = id;
    saveMkt();
    const sel = document.getElementById("a8MarketSel");
    if (sel) sel.value = id;
    renderMarketTable();
  }

  function renderMarketTable() {
    const m = mkById[mkt.sel] || MARKETS[0];
    const body = document.getElementById("a8MarketBody");
    const rule = document.getElementById("a8MarketRule");
    if (!body || !rule) return;
    const r = rules[m.id] || {};
    rule.innerHTML = "<b>" + esc(m.name) + "</b> · " + esc(m.rule) +
      '<br><span style="opacity:.85">상품명 한도 ' + (r.byteMax ? r.byteMax + "byte" : r.nameMax + "자") + " · 근거: " + esc(m.src) + "</span>";
    body.innerHTML = queue.map((it) => {
      const s = evalItem(it, m);
      const nm = finalName(it);
      const len = r.byteMax ? byteLen(nm) + "byte" : chars(nm) + "자";
      const key = it.id + "|" + m.id;
      const cat = mkt.cats[key] || "";
      return '<tr data-row="' + esc(it.id) + '"><td><b>' + esc(it.name) + "</b></td><td>" + esc(nm) + '</td><td class="num">' + len +
        '</td><td><input class="inp a8-rowin" data-cat="' + esc(key) + '" type="text" value="' + esc(cat) + '" placeholder="카테고리 코드"></td>' +
        '<td><span class="pill-mini ' + s.lv + '" data-st>' + s.label + "</span></td>" +
        '<td class="small" data-why>' + esc(s.reasons) + "</td>" +
        '<td><button class="btn sm ghost" data-csvm="' + m.id + '" type="button">CSV</button></td></tr>';
    }).join("") || '<tr><td colspan="7" class="note">큐가 비었습니다.</td></tr>';

    updateMarketBadge();
    $$("[data-cat]", body).forEach((el) => {
      el.addEventListener("change", () => {
        mkt.cats[el.dataset.cat] = el.value.trim();
        saveMkt();
        const id = el.dataset.cat.split("|")[0];
        const it = queue.find((x) => x.id === id);
        if (!it) return;
        const s = evalItem(it, m);
        const tr = el.closest("tr");
        const st = tr && tr.querySelector("[data-st]");
        if (st) { st.className = "pill-mini " + s.lv; st.textContent = s.label; }
        const why = tr && tr.querySelector("[data-why]");
        if (why) why.textContent = s.reasons;
        $$("[data-cell]").forEach((c) => {
          if (c.dataset.cell !== el.dataset.cat) return;
          const sp = c.querySelector("span");
          if (sp) { sp.className = "pill-mini " + s.lv; sp.textContent = s.label; sp.title = s.reasons; }
        });
        updateMatrixCounts();
        updateMarketBadge();
      });
    });
    $$("[data-csvm]", body).forEach((b) => b.addEventListener("click", () => exportOne(b.dataset.csvm)));
  }

  function marketCounts(m) {
    let ok = 0, warn = 0, bad = 0;
    queue.forEach((it) => { const s = evalItem(it, m); if (s.lv === "ok") ok++; else if (s.lv === "warn") warn++; else bad++; });
    return { ok: ok, warn: warn, bad: bad };
  }
  function updateMarketBadge() {
    const m = mkById[mkt.sel];
    if (!m) return;
    const c = marketCounts(m);
    const badge = document.getElementById("a8MarketBadge");
    if (!badge) return;
    badge.textContent = "정상 " + c.ok + " · 보완 " + c.warn + " · 수정 " + c.bad;
    badge.className = "badge " + (c.bad ? "bad" : (c.warn ? "warn" : "ok"));
  }

  function renderRules() {
    const body = document.getElementById("a8RuleBody");
    if (!body) return;
    body.innerHTML = MARKETS.map((m) => {
      const r = rules[m.id] || {};
      return "<tr><td><b>" + esc(m.name) + "</b></td>" +
        '<td class="num"><input class="inp a8-rowin" data-rule="' + m.id + '" type="number" min="5" max="200" step="1" value="' + (r.byteMax ? r.byteMax : r.nameMax) + '" style="width:88px;text-align:right"> ' + (r.byteMax ? "byte" : "자") + "</td>" +
        '<td><span class="pill-mini ' + (String(mkt.notice || "").trim() ? "ok" : "bad") + '">' + (String(mkt.notice || "").trim() ? "필수" : "미입력") + "</span></td>" +
        '<td><span class="pill-mini bad">필수</span></td>' +
        '<td class="small">' + (m.noAd ? "배송·광고 문구" : m.global ? "HS·원산지" : "특수문자 제한") + "</td>" +
        '<td class="small">' + esc(m.src) + "</td></tr>";
    }).join("");
    $$("[data-rule]", body).forEach((el) => {
      el.addEventListener("change", () => {
        const id = el.dataset.rule;
        const m = mkById[id];
        const v = Math.max(5, Math.min(200, nz(el.value, m.nameMax)));
        rules[id] = { nameMax: m.nameMax, byteMax: m.byteMax || 0 };
        if (m.byteMax) rules[id].byteMax = v; else rules[id].nameMax = v;
        saveRules();
        renderMatrix();
        renderMarketTable();
        renderStatus();
        toast(m.short + " 상품명 한도를 " + v + (m.byteMax ? "byte" : "자") + "로 바꿨습니다");
      });
    });
  }

  function renderChkList() {
    const box = document.getElementById("a8ChkList");
    if (!box) return;
    box.innerHTML = MARKETS.map((m) =>
      '<label class="check-item"><input type="checkbox" data-chk="' + m.id + '"' + (selMarkets.indexOf(m.id) >= 0 ? " checked" : "") + '><span><b>' + esc(m.name) + "</b><small>" + esc(m.cols.length + "개 항목 · UTF-8 BOM") + "</small></span></label>"
    ).join("");
    $$("[data-chk]", box).forEach((el) => el.addEventListener("change", () => {
      const id = el.dataset.chk;
      selMarkets = selMarkets.filter((x) => x !== id);
      if (el.checked) selMarkets.push(id);
      updateExportNote();
    }));
  }

  function updateExportNote() {
    const el = document.getElementById("a8ExportNote");
    if (!el) return;
    const n = selMarkets.length;
    el.textContent = n ? "선택 " + n + "개 마켓 · " + (n === 1 ? "CSV 1개" : "ZIP 1개(ZIP 안에 CSV " + n + "개)") : "마켓을 하나 이상 고르세요.";
  }

  function renderCommonInputs() {
    const set = (id, v) => { const el = document.getElementById(id); if (el && el.value !== v) el.value = v; };
    set("a8Notice", mkt.notice || "");
    set("a8Origin", mkt.origin || "");
    set("a8Hs", mkt.hs || "");
    set("a8Brand", mkt.brand || "");
  }

  function renderStatus() {
    const el = document.getElementById("a8Status");
    if (!el) return;
    const pre = preset.prefix ? "‘" + preset.prefix + "’ " : "없음";
    const dirty = draftDirty() ? " · <b style=\"color:#b45309\">미적용 변경 있음 — [일괄 적용]을 누르세요</b>" : "";
    el.innerHTML = "큐 " + queue.length + "개 · 접두어 " + esc(pre) + " · " + preset.maxLen + "자 컷 · 환율 ×" + preset.fx +
      " · " + preset.round + "원 반올림 · 마켓 8곳 · 대표이미지 " + (imgOk ? "1000×1000 내보냄" : "미완") + " · 이 기기(localStorage)에만 저장" + dirty;
  }

  function renderAll() {
    renderQueue();
    renderSamples();
    renderMatrix();
    fillMarketSelect();
    renderMarketTable();
    renderRules();
    renderChkList();
    renderCommonInputs();
    updateExportNote();
    updateFormulaDemo();
    renderStatus();
  }
  function renderMarkets() {
    renderMatrix();
    renderMarketTable();
    renderRules();
    renderStatus();
  }

  /* ── CSV / ZIP ── */
  function rowFor(m, it) {
    const nm = finalName(it);
    const pr = priceOf(it);
    const cat = mkt.cats[it.id + "|" + m.id] || "";
    const img = imgOk ? "all8-main-1000x1000-" + stamp() + ".png" : "";
    const shipTxt = nz(it.ship, 0) > 0 ? "유료 " + nz(it.ship, 0) + "원" : "무료";
    const notice = String(mkt.notice || "").replace(/\r?\n/g, " ");
    switch (m.id) {
      case "coupang": return [it.name, nm, cat, pr, 100, "로켓그로스", img, notice, it.url || ""];
      case "naver": return [nm, cat, pr, 100, shipTxt, img, notice, mkt.origin || "", it.url || ""];
      case "gmarket":
      case "auction": return [nm, "", cat, pr, 100, shipTxt, img, notice];
      case "eleven": return [nm, cat, pr, 100, shipTxt, img, notice, it.url || ""];
      case "eleven_g": return ["", nm, mkt.hs || "", mkt.origin || "", pr, 100, img, it.url || ""];
      case "lotteon": return [mkt.brand || "", nm, cat, pr, 100, img, notice];
      case "toss": return [nm, cat, pr, 100, img, it.memo || nm, it.url || ""];
      default: return [nm, cat, pr];
    }
  }
  function csvFor(m) {
    const rows = [m.cols.slice()];
    queue.forEach((it) => rows.push(rowFor(m, it)));
    return "\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  function exportOne(id) {
    const m = mkById[id];
    if (!m) return;
    if (!queue.length) { toast("큐에 상품이 없습니다"); return; }
    saveBlob(new Blob([csvFor(m)], { type: "text/csv;charset=utf-8" }), "all8_" + m.id + "_" + stamp() + ".csv");
    toast(m.short + " CSV를 내보냈습니다 (" + queue.length + "행 · UTF-8 BOM)");
  }

  const CRC_TABLE = (function () {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function makeZip(files) {
    const enc = new TextEncoder();
    const chunks = [];
    const centrals = [];
    let offset = 0;
    const now = new Date();
    const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xFFFF;
    const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
    files.forEach((f) => {
      const nameBytes = enc.encode(f.name);
      const data = enc.encode(f.text);
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);
      lh.setUint16(4, 20, true);
      lh.setUint16(6, 0x0800, true);
      lh.setUint16(8, 0, true);
      lh.setUint16(10, dosTime, true);
      lh.setUint16(12, dosDate, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true);
      lh.setUint16(26, nameBytes.length, true);
      lh.setUint16(28, 0, true);
      chunks.push(new Uint8Array(lh.buffer), nameBytes, data);

      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true);
      ch.setUint16(4, 20, true);
      ch.setUint16(6, 20, true);
      ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true);
      ch.setUint16(12, dosTime, true);
      ch.setUint16(14, dosDate, true);
      ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true);
      ch.setUint32(24, data.length, true);
      ch.setUint16(28, nameBytes.length, true);
      ch.setUint16(30, 0, true);
      ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true);
      ch.setUint16(36, 0, true);
      ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      centrals.push(new Uint8Array(ch.buffer), nameBytes);

      offset += 30 + nameBytes.length + data.length;
    });
    const cdSize = centrals.reduce((n, c) => n + c.length, 0);
    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0, 0x06054b50, true);
    eocd.setUint16(4, 0, true);
    eocd.setUint16(6, 0, true);
    eocd.setUint16(8, files.length, true);
    eocd.setUint16(10, files.length, true);
    eocd.setUint32(12, cdSize, true);
    eocd.setUint32(16, offset, true);
    eocd.setUint16(20, 0, true);
    return new Blob(chunks.concat(centrals, [new Uint8Array(eocd.buffer)]), { type: "application/zip" });
  }

  function exportSel() {
    const ids = MARKETS.map((m) => m.id).filter((id) => selMarkets.indexOf(id) >= 0);
    if (!ids.length) { toast("내보낼 마켓을 고르세요"); return; }
    if (!queue.length) { toast("큐에 상품이 없습니다"); return; }
    if (ids.length === 1) { exportOne(ids[0]); return; }
    const files = ids.map((id) => ({ name: "all8_" + id + "_" + stamp() + ".csv", text: csvFor(mkById[id]) }));
    saveBlob(makeZip(files), "all8_markets_" + ids.length + "_" + stamp() + ".zip");
    toast(ids.length + "개 마켓 CSV를 ZIP으로 내보냈습니다");
  }
  function exportZip() {
    if (!queue.length) { toast("큐에 상품이 없습니다"); return; }
    const files = MARKETS.map((m) => ({ name: "all8_" + m.id + "_" + stamp() + ".csv", text: csvFor(m) }));
    saveBlob(makeZip(files), "all8_markets_8_" + stamp() + ".zip");
    toast("8개 마켓 CSV를 ZIP으로 내보냈습니다");
  }

  /* ── 탭 ── */
  function showPane(id) {
    ["queue", "studio", "markets"].forEach((k) => {
      const p = document.getElementById("a8Pane" + k.charAt(0).toUpperCase() + k.slice(1));
      if (p) p.classList.toggle("hidden", k !== id);
      const b = document.querySelector('#a8Tabs [data-a8tab="' + k + '"]');
      if (b) b.classList.toggle("active", k === id);
    });
    if (id === "studio") renderStudio();
    if (id === "markets") renderMarkets();
  }

  /* ── 초기화 ── */
  function init() {
    if (!document.getElementById("view-all8")) return;
    loadAll();
    writePresetInputs();
    fillMarketSelect();
    renderAll();
    writeStudioInputs();
    renderStudio();

    $$("#a8Tabs [data-a8tab]").forEach((b) => b.addEventListener("click", () => showPane(b.dataset.a8tab)));
    $$(".preset-row .chip[data-prefix]").forEach((b) => b.addEventListener("click", () => {
      const el = document.getElementById("a8Prefix");
      el.value = b.dataset.prefix || "";
      syncChips();
      updateFormulaDemo();
      renderStatus();
    }));
    ["a8Prefix", "a8MaxLen", "a8Fx", "a8Margin", "a8Round"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", () => { syncChips(); updateFormulaDemo(); renderStatus(); });
      if (el) el.addEventListener("change", () => { syncChips(); updateFormulaDemo(); renderStatus(); });
    });
    document.getElementById("a8Apply").addEventListener("click", applyPreset);
    document.getElementById("a8MarginAll").addEventListener("click", marginAll);
    document.getElementById("a8PresetReset").addEventListener("click", () => {
      preset = { prefix: "", maxLen: 40, fx: 1, margin: 100, round: 100 };
      savePreset(); writePresetInputs(); renderAll();
      toast("프리셋을 기본값으로 되돌렸습니다");
    });
    document.getElementById("a8Add").addEventListener("click", addItem);
    document.getElementById("a8EditSave").addEventListener("click", saveEdit);
    document.getElementById("a8EditCancel").addEventListener("click", () => { endEdit(); toast("수정을 취소했습니다"); });
    document.getElementById("a8SeedRestore").addEventListener("click", restoreSeed);
    document.getElementById("a8QueueCsv").addEventListener("click", queueCsv);
    document.getElementById("a8QueueCopy").addEventListener("click", () => {
      copyText(queue.map((it) => finalName(it)).join("\n"), "상품명 " + queue.length + "개를 복사했습니다");
    });

    // 이미지
    const drop = document.getElementById("a8Drop");
    const file = document.getElementById("a8File");
    drop.addEventListener("click", () => file.click());
    drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
    drop.addEventListener("dragleave", () => drop.classList.remove("over"));
    drop.addEventListener("drop", (e) => {
      e.preventDefault(); drop.classList.remove("over");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) readImageFile(f);
    });
    file.addEventListener("change", () => { if (file.files[0]) readImageFile(file.files[0]); });
    ["a8White", "a8MaskOn", "a8MaskX", "a8MaskY", "a8MaskW", "a8MaskH", "a8MaskColor",
      "a8BadgeText", "a8BadgePos", "a8BadgeSize", "a8BadgeBg", "a8BadgeFg"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", () => { syncStudio(); renderStudio(); });
        if (el) el.addEventListener("change", () => { syncStudio(); renderStudio(); });
      });
    document.getElementById("a8CmpRange").addEventListener("input", (e) => applyCmp(nz(e.target.value, 50)));
    document.getElementById("a8Dl").addEventListener("click", downloadPng);
    document.getElementById("a8Reset").addEventListener("click", () => {
      Object.assign(studio, { white: SDEF.white, maskOn: SDEF.maskOn, maskX: SDEF.maskX, maskY: SDEF.maskY, maskW: SDEF.maskW, maskH: SDEF.maskH, maskColor: SDEF.maskColor, badge: Object.assign({}, SDEF.badge) });
      writeStudioInputs();
      renderStudio();
      toast("가공 설정을 초기화했습니다");
    });

    // 마켓
    document.getElementById("a8MarketSel").addEventListener("change", (e) => selectMarket(e.target.value));
    ["a8Notice", "a8Origin", "a8Hs", "a8Brand"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("change", () => {
        mkt.notice = document.getElementById("a8Notice").value;
        mkt.origin = document.getElementById("a8Origin").value.trim();
        mkt.hs = document.getElementById("a8Hs").value.trim();
        mkt.brand = document.getElementById("a8Brand").value.trim();
        saveMkt(); renderMarkets();
      });
    });
    document.getElementById("a8ExportSel").addEventListener("click", exportSel);
    document.getElementById("a8ExportZip").addEventListener("click", exportZip);
    document.getElementById("a8RuleReset").addEventListener("click", () => {
      rules = {};
      MARKETS.forEach((m) => { rules[m.id] = { nameMax: m.nameMax, byteMax: m.byteMax || 0 }; });
      saveRules(); renderMarkets();
      toast("마켓 규칙을 기본값으로 되돌렸습니다");
    });
  }

  function readImageFile(f) {
    if (!/^image\//.test(f.type)) { toast("이미지 파일만 올릴 수 있습니다"); return; }
    const reader = new FileReader();
    reader.onload = () => loadImg(String(reader.result), f.name + " (" + Math.round(f.size / 1024) + "KB)");
    reader.onerror = () => toast("파일을 읽지 못했습니다");
    reader.readAsDataURL(f);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.HSAll8 = { queue: () => queue.slice(), preset: () => Object.assign({}, preset), finalName, priceOf, csvFor, makeZip, evalItem, studio };
})();
