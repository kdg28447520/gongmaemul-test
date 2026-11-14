/* 동곤 헬프스토어 PRO — tools: 마진 누수 / 상세페이지 스튜디오 / GEO / 틈새 키워드 */
(function () {
  "use strict";
  const HS = window.HS;
  const { $, $$, num, won, pct, esc, clamp, toast, copyText, parseNumber } = HS;

  /* ══════════════════════════════════════════
     3. 매출/마진 누수
     ══════════════════════════════════════════ */
  function channelCalc(o) {
    const rev = o.price * o.qty;
    const cost = o.cost * o.qty;
    const fee = rev * (o.fee / 100);
    const logi = o.logi * o.qty;
    const fixed = o.fixed || 0;
    const ad = o.ad || 0;
    const net = rev - cost - fee - logi - fixed - ad;
    return { rev, cost, fee, logi, fixed, ad, net, margin: rev > 0 ? (net / rev) * 100 : 0, perUnit: o.qty > 0 ? net / o.qty : 0 };
  }

  function renderLeak() {
    const price = num("mlPrice"), cost = num("mlCost"), qty = num("mlQty");
    const rg = channelCalc({
      price, cost, qty, fee: num("mlRgFee"), logi: num("mlRgLogi"),
      fixed: num("mlRgInout"), ad: num("mlRgAd")
    });
    const wg = channelCalc({
      price, cost, qty, fee: num("mlWingFee"), logi: num("mlWingShip") + num("mlWingPack"),
      fixed: 0, ad: num("mlWingAd")
    });

    const rows = [
      ["판매 수량", qty + "개", qty + "개", false],
      ["매출", won(rg.rev), won(wg.rev), false],
      ["상품 원가", won(rg.cost), won(wg.cost), false],
      ["수수료", won(rg.fee), won(wg.fee), false],
      ["물류·배송비", won(rg.logi), won(wg.logi), false],
      ["입출고·보관비", won(rg.fixed), won(wg.fixed), false],
      ["광고비", won(rg.ad), won(wg.ad), false]
    ];
    const body = rows.map((r) => "<tr><td>" + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + "</td><td class='num small'>—</td></tr>").join("");
    const diffNet = rg.net - wg.net;
    const diffMargin = rg.margin - wg.margin;
    $("#mlCompareBody").innerHTML = body +
      '<tr class="total"><td>순이익</td><td class="num">' + won(rg.net) + '</td><td class="num">' + won(wg.net) + "</td><td class='num'>" + (diffNet >= 0 ? "+" : "") + won(diffNet).replace("-", "-") + "</td></tr>" +
      "<tr><td>마진율</td><td class='num'><b>" + pct(rg.margin) + "</b></td><td class='num'><b>" + pct(wg.margin) + "</b></td><td class='num'>" + (diffMargin >= 0 ? "+" : "") + diffMargin.toFixed(1) + "%p</td></tr>" +
      "<tr><td class='small'>건당 순이익</td><td class='num small'>" + won(rg.perUnit) + "</td><td class='num small'>" + won(wg.perUnit) + "</td><td class='num small'>" + (rg.perUnit - wg.perUnit >= 0 ? "+" : "") + won(rg.perUnit - wg.perUnit) + "</td></tr>";

    const v = $("#mlVerdict");
    const winner = rg.net >= wg.net ? "로켓그로스" : "판매자배송";
    v.textContent = winner + " 우세 · " + Math.abs(diffMargin).toFixed(1) + "%p";
    v.className = "right badge " + (Math.abs(diffMargin) > 5 ? "ok" : "gray");

    const lossItems = [
      ["수수료", rg.fee, wg.fee],
      ["물류비", rg.logi, wg.logi],
      ["입출고·보관비", rg.fixed, wg.fixed],
      ["광고비", rg.ad, wg.ad]
    ].map((x) => ({ name: x[0], rg: x[1], wg: x[2], loss: x[1] - x[2] }));
    const totalLoss = lossItems.filter((x) => x.loss > 0).reduce((a, b) => a + b.loss, 0);
    $("#mlLossBody").innerHTML = lossItems.map((x) => {
      const pp = wg.rev > 0 ? (x.loss / wg.rev) * 100 : 0;
      const cls = x.loss > 0 ? "bad" : x.loss < 0 ? "ok" : "gray";
      return "<tr><td>" + x.name + '</td><td class="num">' + won(x.rg) + '</td><td class="num">' + won(x.wg) + "</td><td class='num'><span class='pill-mini " + cls + "'>" + (x.loss > 0 ? "+" : "") + won(x.loss) + " · " + (pp >= 0 ? "+" : "") + pp.toFixed(1) + "%p</span></td></tr>";
    }).join("") +
      '<tr class="total"><td>합계</td><td class="num">' + won(rg.fee + rg.logi + rg.fixed + rg.ad) + '</td><td class="num">' + won(wg.fee + wg.logi + wg.fixed + wg.ad) + "</td><td class='num'>" + won(totalLoss) + "</td></tr>";

    const biggest = lossItems.filter((x) => x.loss > 0).sort((a, b) => b.loss - a.loss)[0];
    const sum = $("#mlSummary");
    if (Math.abs(diffMargin) < 0.05) {
      sum.className = "callout info";
      sum.textContent = "두 채널 마진이 사실상 같습니다. 광고비·물류비가 비슷하게 잡혀 있는지 입력값을 확인하세요.";
    } else {
      const worse = diffMargin < 0 ? "로켓그로스" : "판매자배송";
      const better = diffMargin < 0 ? "판매자배송" : "로켓그로스";
      const share = biggest && totalLoss > 0 ? Math.round((biggest.loss / totalLoss) * 100) : 0;
      sum.className = "callout warn";
      sum.textContent = "같은 상품·같은 판매가인데 " + worse + " 마진율이 " + Math.abs(diffMargin).toFixed(1) + "%p 낮습니다. 월 " + won(Math.abs(diffNet)) + " 차이입니다. " +
        (biggest ? "가장 큰 누수는 " + biggest.name + "(" + won(biggest.loss) + ", 손실의 약 " + share + "%)" : "비용 구조를 다시 확인하세요") +
        " — " + better + "의 비용 구조로 옮길 수 있는 항목부터 조정하세요.";
    }

    const acts = [];
    const adLoss = rg.ad - wg.ad;
    if (adLoss > 0) {
      const adRate = rg.rev > 0 ? (rg.ad / rg.rev) * 100 : 0;
      acts.push("로켓그로스 광고비 " + won(rg.ad) + "은 매출의 " + pct(adRate) + "입니다. 클릭당 비용과 전환율을 확인하고, 주문 0원 키워드부터 끄세요.");
    }
    if (rg.logi / Math.max(qty, 1) > 0) {
      acts.push("로켓그로스 물류비가 건당 " + won(rg.logi / Math.max(qty, 1)) + "입니다. 판매자배송 택배비(" + won(num("mlWingShip")) + ")와 비교해 월 " + qty + "건 이상이면 직접 출고가 유리한지 계산해 보세요.");
    }
    if (wg.net > rg.net) acts.push("판매자배송이 월 " + won(wg.net - rg.net) + " 더 남습니다. 판매자배송 비중을 늘리되, 포장·CS 인건비와 로켓그로스 노출 프리미엄을 함께 보고 결정하세요.");
    else if (rg.net > wg.net) acts.push("로켓그로스가 월 " + won(rg.net - wg.net) + " 더 남습니다. 다만 광고비 비중이 높으니 광고를 줄여도 판매량이 유지되는지 2주간 테스트하세요.");
    while (acts.length < 2) acts.push("수수료율과 건당 물류비를 실제 정산서 숫자로 바꿔 다시 계산하세요. 기본값은 참고치입니다.");
    $("#mlActions").innerHTML = acts.slice(0, 3).map((a) => "<li>" + a + "</li>").join("");
  }

  /* 정산 CSV */
  const SETTLE_ALIAS = {
    product: ["상품명", "상품", "품명", "product", "name", "item"],
    channel: ["배송유형", "배송", "채널", "channel", "type", "배송방법"],
    price: ["판매가", "단가", "price"],
    qty: ["수량", "판매수량", "qty", "quantity"],
    rev: ["매출", "매출액", "revenue", "sales"],
    fee: ["수수료", "수수료비", "fee"],
    logi: ["물류비", "배송비", "택배비", "logistics", "shipping"],
    ad: ["광고비", "ad", "adcost"],
    cost: ["원가", "상품원가", "매입가", "cost"]
  };
  const SAMPLE_SETTLE = [
    ["상품명", "배송유형", "판매가", "수량", "매출", "수수료", "물류비", "광고비", "원가"].join(","),
    ["스테인리스 텀블러 900ml", "로켓그로스", 25900, 180, 4662000, 503496, 575280, 812000, 1404000].join(","),
    ["스테인리스 텀블러 900ml", "판매자배송", 25900, 120, 3108000, 335664, 294000, 186000, 936000].join(","),
    ["보온 도시락", "로켓그로스", 32900, 90, 2961000, 319788, 287640, 462000, 1152000].join(","),
    ["보온 도시락", "판매자배송", 32900, 60, 1974000, 213192, 147000, 98000, 768000].join(","),
    ["미니 히터", "로켓그로스", 18900, 240, 4536000, 489888, 767040, 1280000, 2160000].join(","),
    ["미니 히터", "판매자배송", 18900, 150, 2835000, 306180, 367500, 240000, 1350000].join(","),
    ["캠핑 랜턴", "로켓그로스", 22900, 110, 2519000, 272052, 351560, 380000, 990000].join(","),
    ["캠핑 랜턴", "판매자배송", 22900, 80, 1832000, 197856, 196000, 74000, 720000].join(",")
  ].join("\n");

  function normHead(h) { return String(h).toLowerCase().replace(/[\s()\-_/.]/g, ""); }
  function settleKey(h) {
    const n = normHead(h);
    if (!n) return null;
    for (const k of Object.keys(SETTLE_ALIAS)) {
      for (const a of SETTLE_ALIAS[k]) if (n === normHead(a)) return k;
    }
    for (const k of Object.keys(SETTLE_ALIAS)) {
      for (const a of SETTLE_ALIAS[k]) {
        const na = normHead(a);
        if (na.length > 1 && (n.indexOf(na) === 0 || na.indexOf(n) === 0)) return k;
      }
    }
    return null;
  }
  function splitCsvLine(line, d) {
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
  function parseSettle(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return { rows: [], error: "데이터가 없습니다." };
    const d = (lines[0].match(/\t/g) || []).length >= (lines[0].match(/,/g) || []).length ? "\t" : ",";
    const head = splitCsvLine(lines[0], d).map((s) => s.trim());
    const map = {};
    head.forEach((h, i) => { const k = settleKey(h); if (k && map[k] === undefined) map[k] = i; });
    if (map.product === undefined || map.rev === undefined) return { rows: [], error: "상품명·매출 컬럼을 찾지 못했습니다. 첫 줄에 컬럼명을 넣어 주세요." };
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const c = splitCsvLine(lines[i], d);
      const name = (c[map.product] || "").trim();
      if (!name) continue;
      const rev = parseNumber(c[map.rev]);
      const fee = parseNumber(c[map.fee]);
      const logi = parseNumber(c[map.logi]);
      const ad = parseNumber(c[map.ad]);
      const cost = parseNumber(c[map.cost]);
      const qty = parseNumber(c[map.qty]) || 0;
      const net = rev - fee - logi - ad - cost;
      rows.push({
        name, channel: (c[map.channel] || "—").trim(), price: parseNumber(c[map.price]), qty,
        rev, fee, logi, ad, cost, net, margin: rev > 0 ? (net / rev) * 100 : 0
      });
    }
    return { rows, error: rows.length ? null : "행을 읽지 못했습니다." };
  }

  function renderSettle() {
    const parsed = parseSettle($("#mlCsv").value);
    if (parsed.error) { toast(parsed.error); $("#mlCsvBadge").textContent = "오류"; $("#mlCsvBadge").className = "right badge bad"; return; }
    const rows = parsed.rows.sort((a, b) => a.margin - b.margin);
    const body = $("#mlCsvBody");
    body.innerHTML = rows.map((r) => {
      const cls = r.margin < 0 ? "bad" : r.margin < 10 ? "warn" : "ok";
      return "<tr><td><b>" + esc(r.name) + "</b><div class='small'>" + won(r.rev) + " / " + r.qty + "개</div></td>" +
        "<td class='small'>" + esc(r.channel) + "</td>" +
        "<td class='num'>" + won(r.rev) + "</td>" +
        "<td class='num small'>" + won(r.fee + r.logi + r.ad + r.cost) + "</td>" +
        "<td class='num'><b>" + won(r.net) + "</b></td>" +
        "<td class='num'><span class='pill-mini " + cls + "'>" + pct(r.margin) + "</span></td></tr>";
    }).join("");

    const agg = rows.reduce((a, r) => ({ rev: a.rev + r.rev, net: a.net + r.net, ad: a.ad + r.ad, fee: a.fee + r.fee, logi: a.logi + r.logi, cost: a.cost + r.cost }), { rev: 0, net: 0, ad: 0, fee: 0, logi: 0, cost: 0 });
    const overall = agg.rev > 0 ? (agg.net / agg.rev) * 100 : 0;
    const worst = rows[0];
    const byCh = {};
    rows.forEach((r) => {
      const k = r.channel || "—";
      if (!byCh[k]) byCh[k] = { rev: 0, net: 0 };
      byCh[k].rev += r.rev; byCh[k].net += r.net;
    });
    const chLines = Object.keys(byCh).filter((k) => byCh[k].rev > 0).map((k) => k + " " + pct((byCh[k].net / byCh[k].rev) * 100));
    const badge = $("#mlCsvBadge");
    badge.textContent = "마진 " + pct(overall);
    badge.className = "right badge " + (overall >= 20 ? "ok" : overall >= 10 ? "warn" : "bad");

    const sum = $("#mlCsvSummary");
    sum.className = "callout " + (overall >= 20 ? "ok" : "warn");
    sum.innerHTML = "전체 마진율 <b>" + pct(overall) + "</b>" + (chLines.length > 1 ? " (" + chLines.join(" · ") + ")" : "") + ". " +
      "가장 나쁜 상품은 <b>" + esc(worst.name) + " " + esc(worst.channel) + "</b>로 마진 " + pct(worst.margin) + ", 월 " + won(worst.net) + "입니다. " +
      "광고비가 매출의 " + pct(agg.rev > 0 ? (agg.ad / agg.rev) * 100 : 0) + "를 차지합니다.";

    const acts = [];
    if (worst.margin < 0) acts.push("<b>" + esc(worst.name) + " " + esc(worst.channel) + "</b>가 월 " + won(worst.net) + " 적자입니다. 광고를 끄거나 판매가를 " + won(Math.abs(worst.net) / Math.max(worst.qty, 1)) + " 이상 올려야 손익분기가 맞습니다.");
    if (agg.ad / Math.max(agg.rev, 1) > 0.08) acts.push("광고비가 매출의 " + pct((agg.ad / agg.rev) * 100) + "입니다. 적자 상품 광고부터 끄고, 광고 분석 탭에서 키워드를 다시 분류하세요.");
    const chKeys = Object.keys(byCh).filter((k) => byCh[k].rev > 0).map((k) => ({ k, m: (byCh[k].net / byCh[k].rev) * 100 }));
    if (chKeys.length > 1) {
      chKeys.sort((a, b) => a.m - b.m);
      acts.push("채널별로는 " + chKeys[0].k + " " + pct(chKeys[0].m) + " vs " + chKeys[chKeys.length - 1].k + " " + pct(chKeys[chKeys.length - 1].m) + ". 마진이 낮은 채널의 물류비·광고비 항목을 마진 누수 탭에서 1:1로 비교하세요.");
    }
    while (acts.length < 2) acts.push("정산서 기준으로 수수료·물류비를 다시 확인하세요. 실제 정산 금액과 입력값이 다르면 마진율이 달라집니다.");
    $("#mlCsvActions").innerHTML = acts.slice(0, 3).map((a) => "<li>" + a + "</li>").join("");
    toast(rows.length + "개 상품을 진단했습니다");
  }

  function initLeak() {
    ["mlPrice", "mlCost", "mlQty", "mlRgFee", "mlRgLogi", "mlRgInout", "mlRgAd", "mlWingFee", "mlWingShip", "mlWingPack", "mlWingAd", "mlName"]
      .forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener("input", renderLeak); });
    renderLeak();
    $$("#mlTabs button").forEach((b) => b.addEventListener("click", () => {
      $$("#mlTabs button").forEach((x) => x.classList.toggle("active", x === b));
      $("#mlPaneCompare").classList.toggle("hidden", b.dataset.mltab !== "compare");
      $("#mlPaneCsv").classList.toggle("hidden", b.dataset.mltab !== "csv");
    }));
    $("#mlCsvSample").addEventListener("click", () => { $("#mlCsv").value = SAMPLE_SETTLE; renderSettle(); });
    $("#mlCsvRun").addEventListener("click", renderSettle);
    $("#mlCsvClear").addEventListener("click", () => {
      $("#mlCsv").value = "";
      $("#mlCsvBody").innerHTML = '<tr><td colspan="6" class="note">샘플을 불러오거나 정산 데이터를 붙여넣으세요.</td></tr>';
      $("#mlCsvBadge").textContent = "대기";
      $("#mlCsvBadge").className = "right badge gray";
      $("#mlCsvSummary").textContent = "진단 전입니다.";
      $("#mlCsvActions").innerHTML = '<li class="note">진단 후 자동 생성됩니다.</li>';
    });
  }

  /* ══════════════════════════════════════════
     4. 상세페이지 스튜디오
     ══════════════════════════════════════════ */
  const BG = {
    ivory: { from: "#fdfcf8", to: "#ece5d8", ink: "#1b1a17", sub: "#6b6459", accent: "#b08a57" },
    slate: { from: "#f5f8fc", to: "#dbe4ee", ink: "#101d2e", sub: "#5b6b7d", accent: "#4f6b8a" },
    sand: { from: "#f8f0e7", to: "#e6d2b9", ink: "#231b12", sub: "#7a6a56", accent: "#c08a52" },
    mint: { from: "#f0faf6", to: "#d3eee2", ink: "#0f2620", sub: "#4f6f64", accent: "#2f8f74" },
    night: { from: "#232f3f", to: "#0a1119", ink: "#f8fafc", sub: "#cbd5e1", accent: "#e2b76a" }
  };
  const studio = { img: null, bg: "ivory", shadow: true, frame: "none", badge: "무료배송", format: "square" };

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }
  function demandText(ctx, text, maxW, maxLines) {
    const words = String(text).split(" ");
    const lines = [];
    let cur = "";
    words.forEach((w) => {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
      else cur = t;
    });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) {
      lines.length = maxLines;
      let last = lines[maxLines - 1];
      while (ctx.measureText(last + "…").width > maxW && last.length > 1) last = last.slice(0, -1);
      lines[maxLines - 1] = last + "…";
    }
    return lines;
  }
  function demoProduct() {
    const c = document.createElement("canvas");
    c.width = 720; c.height = 900;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(210, 0, 540, 0);
    g.addColorStop(0, "#7d8b9c"); g.addColorStop(0.18, "#e9eff5"); g.addColorStop(0.45, "#c2ccd7");
    g.addColorStop(0.72, "#96a4b4"); g.addColorStop(1, "#6f7c8c");
    rr(x, 205, 175, 310, 650, 30); x.fillStyle = g; x.fill();
    rr(x, 185, 128, 350, 78, 26); x.fillStyle = "#1f2937"; x.fill();
    x.fillStyle = "rgba(255,255,255,.35)";
    rr(x, 240, 205, 26, 580, 13); x.fill();
    x.fillStyle = "rgba(15,23,42,.18)";
    rr(x, 205, 700, 310, 12, 6); x.fill();
    return c;
  }

  function drawScene() {
    const cv = $("#stCanvas");
    if (!cv) return;
    const story = studio.format === "story";
    cv.width = 1080; cv.height = story ? 1350 : 1080;
    $("#stSize").textContent = "1080×" + (story ? 1350 : 1080);
    const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height;
    const b = BG[studio.bg] || BG.ivory;

    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, b.from); g.addColorStop(1, b.to);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // 부드러운 원형 라이트
    const rg = ctx.createRadialGradient(W * 0.5, H * 0.36, 40, W * 0.5, H * 0.36, W * 0.68);
    rg.addColorStop(0, studio.bg === "night" ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.85)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // 제품 영역
    const box = story
      ? { x: 110, y: 150, w: 860, h: 620 }
      : { x: 120, y: 150, w: 840, h: 560 };
    const img = studio.img;
    if (img) {
      const iw = img.width || img.videoWidth || 720;
      const ih = img.height || img.videoHeight || 900;
      const s = Math.min(box.w / iw, box.h / ih);
      const dw = iw * s, dh = ih * s;
      const dx = box.x + (box.w - dw) / 2;
      const dy = box.y + (box.h - dh) / 2;
      if (studio.shadow) {
        ctx.save();
        ctx.globalAlpha = studio.bg === "night" ? 0.35 : 0.22;
        ctx.filter = "blur(24px)";
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(dx + dw / 2, dy + dh - dh * 0.03, dw * 0.36, dh * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.shadowColor = studio.bg === "night" ? "rgba(0,0,0,.55)" : "rgba(15,23,42,.18)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.08)" : "rgba(15,23,42,.05)";
      rr(ctx, box.x + 120, box.y + 60, box.w - 240, box.h - 120, 24);
      ctx.fill();
      ctx.fillStyle = b.sub;
      ctx.font = '600 26px Pretendard, "Malgun Gothic", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("제품 이미지를 올려 주세요", W / 2, box.y + box.h / 2);
      ctx.restore();
    }

    // 배지
    if (studio.badge) {
      ctx.save();
      ctx.font = '800 26px Pretendard, "Malgun Gothic", sans-serif';
      const tw = ctx.measureText(studio.badge).width;
      const bw = tw + 52, bh = 56;
      ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.94)" : "rgba(15,23,42,.9)";
      rr(ctx, 64, 58, bw, bh, 28); ctx.fill();
      ctx.fillStyle = studio.bg === "night" ? "#0f172a" : "#ffffff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(studio.badge, 64 + bw / 2, 58 + bh / 2 + 1);
      ctx.restore();
    }

    // 브랜드 워터마크
    ctx.save();
    ctx.font = '700 20px Pretendard, "Malgun Gothic", sans-serif';
    ctx.fillStyle = b.sub;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("동곤 헬프스토어 PRO", W - 64, 84);
    ctx.restore();

    // 텍스트 블록
    const headline = $("#stHeadline").value.trim() || "제품의 핵심을 한 줄로";
    const subline = $("#stSubline").value.trim();
    const textTop = story ? 900 : 760;
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = b.ink;
    ctx.font = '800 54px Pretendard, "Malgun Gothic", sans-serif';
    const lines = demandText(ctx, headline, W - 128, 2);
    lines.forEach((ln, i) => ctx.fillText(ln, 64, textTop + i * 66));
    let y = textTop + lines.length * 66;
    if (subline) {
      ctx.font = '600 30px Pretendard, "Malgun Gothic", sans-serif';
      ctx.fillStyle = b.sub;
      const subs = demandText(ctx, subline, W - 128, 1);
      subs.forEach((ln) => { y += 16; ctx.fillText(ln, 64, y + 26); y += 26; });
    }
    // 구분선 + 푸터
    ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.25)" : "rgba(15,23,42,.14)";
    ctx.fillRect(64, H - 92, 64, 3);
    ctx.font = '600 20px Pretendard, "Malgun Gothic", sans-serif';
    ctx.fillStyle = b.sub;
    ctx.fillText("free · unlimited seller tools", 64, H - 56);
    ctx.restore();

    // 프레임
    if (studio.frame === "thin") {
      ctx.save();
      ctx.strokeStyle = studio.bg === "night" ? "rgba(255,255,255,.35)" : "rgba(15,23,42,.22)";
      ctx.lineWidth = 2;
      ctx.strokeRect(28, 28, W - 56, H - 56);
      ctx.restore();
    } else if (studio.frame === "gold") {
      ctx.save();
      const fg = ctx.createLinearGradient(0, 0, W, H);
      fg.addColorStop(0, "#d8b06a"); fg.addColorStop(0.5, "#f3e2bc"); fg.addColorStop(1, "#b98d47");
      ctx.strokeStyle = fg; ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(216,176,106,.45)";
      ctx.strokeRect(48, 48, W - 96, H - 96);
      ctx.restore();
    }
  }

  function initStudio() {
    drawScene();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawScene()).catch(() => {});
    $$("#stBg .swatch").forEach((sw) => sw.addEventListener("click", () => {
      studio.bg = sw.dataset.bg;
      $$("#stBg .swatch").forEach((x) => x.classList.toggle("on", x === sw));
      drawScene();
    }));
    ["stFormat", "stFrame", "stBadge"].forEach((id) => $("#" + id).addEventListener("change", () => {
      studio.format = $("#stFormat").value;
      studio.frame = $("#stFrame").value;
      studio.badge = $("#stBadge").value;
      drawScene();
    }));
    $("#stShadow").addEventListener("change", () => { studio.shadow = $("#stShadow").checked; drawScene(); });
    $("#stHeadline").addEventListener("input", drawScene);
    $("#stSubline").addEventListener("input", drawScene);
    $("#stRender").addEventListener("click", () => { drawScene(); toast("미리보기를 갱신했습니다"); });

    const fileEl = $("#stFile");
    $("#stDrop").addEventListener("click", () => fileEl.click());
    $("#stDrop").addEventListener("dragover", (e) => { e.preventDefault(); $("#stDrop").classList.add("over"); });
    $("#stDrop").addEventListener("dragleave", () => $("#stDrop").classList.remove("over"));
    $("#stDrop").addEventListener("drop", (e) => {
      e.preventDefault();
      $("#stDrop").classList.remove("over");
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadImg(f);
    });
    fileEl.addEventListener("change", () => { if (fileEl.files[0]) loadImg(fileEl.files[0]); });
    function loadImg(file) {
      if (!/^image\//.test(file.type)) { toast("이미지 파일만 올릴 수 있습니다"); return; }
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        studio.img = im;
        $("#stFileNote").textContent = file.name + " · " + im.width + "×" + im.height + " (브라우저 안에서만 처리)";
        drawScene();
        URL.revokeObjectURL(url);
        toast("이미지를 올렸습니다");
      };
      im.onerror = () => toast("이미지를 읽지 못했습니다");
      im.src = url;
    }
    $("#stDemoImg").addEventListener("click", () => {
      studio.img = demoProduct();
      $("#stFileNote").textContent = "예시 제품(텀블러)으로 합성 중입니다. 내 이미지를 올리면 바로 교체됩니다.";
      drawScene();
    });

    $("#stDownload").addEventListener("click", () => {
      drawScene();
      const cv = $("#stCanvas");
      const name = "helpstore-" + (studio.format === "story" ? "cardnews-1080x1350" : "artwork-1080x1080") + ".png";
      if (cv.toBlob) {
        cv.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = name;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 3000);
          toast("PNG를 저장했습니다");
        }, "image/png");
      } else {
        const a = document.createElement("a");
        a.href = cv.toDataURL("image/png");
        a.download = name;
        a.click();
      }
    });

    // 카피
    $("#cGen").addEventListener("click", genCopy);
    $("#cCopy").addEventListener("click", () => {
      const t = window.__copyPlain || $("#cOut").textContent;
      if (!window.__copyPlain) { toast("먼저 카피를 생성하세요"); return; }
      copyText(t, "상세페이지 카피를 복사했습니다");
    });
    genCopy();
    $$("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      const el = document.getElementById(b.dataset.copy);
      if (el) copyText(el.textContent, "복사했습니다");
    }));
  }

  function genCopy() {
    const name = ($("#cName").value || "제품명").trim();
    const target = ($("#cTarget").value || "고객").trim();
    const pts = $("#cPoints").value.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    const p1 = pts[0] || "쓰는 순간이 달라지는 구성";
    const p2 = pts[1] || "출고 전 구성품을 하나씩 확인합니다";
    const p3 = pts[2] || "안내 카드를 함께 보내드립니다";
    const short = name.length > 22 ? name.slice(0, 22) + "…" : name;

    const steps = [
      {
        h: "1. 메인 헤드라인",
        lines: [name, p1]
      },
      {
        h: "2. 공감 도입",
        paras: [
          target + "라면 한 번쯤 겪어 보셨을 겁니다. 사진은 그럴듯한데 막상 손이 가지 않는 물건.",
          name + "는 그 지점부터 다르게 잡았습니다. " + p1 + ".",
          p2 + (pts[2] ? ", " + p3 : "") + " — 받는 날부터 바로 쓰실 수 있습니다."
        ]
      },
      {
        h: "3. 사용 장면",
        lead: "사진이 아니라 장면으로 보여 주세요. 세 가지 상황이면 충분합니다.",
        items: [
          "아침 준비: 정신없는 아침, " + short + "를 꺼내는 순간 준비가 한 단계 줄어듭니다. " + p1 + ".",
          "주말 저녁: " + target + "이 가장 편하게 쓰는 시간입니다. " + (pts[1] || "손이 자주 가는 자리에 두고 씁니다") + ".",
          "선물하는 날: 포장을 열었을 때의 반응까지 계산했습니다. " + (pts[2] || "안내 카드와 함께 보내드립니다") + "."
        ]
      },
      {
        h: "4. 출고·품질 신뢰",
        paras: [
          "후기가 아닌 출고 과정으로 보여드립니다.",
          p2 + ". " + (pts[2] || "파손 없이 도착하도록 내부 완충재로 나누어 담습니다") + ". 문의는 확인하는 대로 순서대로 답변드립니다."
        ]
      }
    ];

    const html = steps.map((s) => {
      let inner = "";
      if (s.lines) inner += s.lines.map((l, i) => i === 0 ? "<p><b>" + esc(l) + "</b></p>" : "<p>" + esc(l) + "</p>").join("");
      if (s.lead) inner += "<p>" + esc(s.lead) + "</p>";
      if (s.paras) inner += s.paras.map((p) => "<p>" + esc(p) + "</p>").join("");
      if (s.items) inner += "<ul>" + s.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>";
      return '<div class="step"><h4>' + s.h + "</h4>" + inner + "</div>";
    }).join("");
    $("#cOut").innerHTML = html;

    const plain = steps.map((s) => {
      let t = "[" + s.h + "]\n";
      if (s.lines) t += s.lines.join("\n") + "\n";
      if (s.lead) t += s.lead + "\n";
      if (s.paras) t += s.paras.join("\n") + "\n";
      if (s.items) t += s.items.map((i) => "- " + i).join("\n") + "\n";
      return t;
    }).join("\n");
    window.__copyPlain = plain;
  }

  /* ══════════════════════════════════════════
     5. GEO 분석
     ══════════════════════════════════════════ */
  const GEO_CHECKS = [
    { id: "name", label: "브랜드 표기 통일", desc: "공식몰·상세페이지·보도자료에서 같은 이름으로 씁니다.", w: { chatgpt: 1, claude: 1, perplexity: 1, gemini: 0.5 } },
    { id: "table", label: "비교표 콘텐츠", desc: "경쟁 제품과 스펙을 같은 항목으로 나란히 비교합니다.", w: { chatgpt: 1, claude: 1, perplexity: 1, gemini: 1 } },
    { id: "faq", label: "FAQ 스키마", desc: "질문·답변 구조를 FAQPage JSON-LD로 노출합니다.", w: { chatgpt: 1, claude: 0.5, perplexity: 1, gemini: 1 } },
    { id: "product", label: "Product 스키마", desc: "가격·재고·브랜드를 구조화 데이터로 제공합니다.", w: { chatgpt: 0.5, claude: 0.5, perplexity: 0.5, gemini: 1 } },
    { id: "number", label: "수치·스펙 근거", desc: "용량·소재·인증을 숫자와 출처로 표기합니다.", w: { chatgpt: 1, claude: 1, perplexity: 1, gemini: 0.5 } },
    { id: "cite", label: "외부 인용 확보", desc: "추천 리스트·커뮤니티·리뷰 매체에 제품이 언급됩니다.", w: { chatgpt: 0.5, claude: 1, perplexity: 1, gemini: 0.5 } },
    { id: "link", label: "판매처 링크 일관성", desc: "공식몰·스마트스토어·쿠팡 링크가 같은 정보를 가리킵니다.", w: { chatgpt: 0.5, claude: 0.5, perplexity: 1, gemini: 1 } },
    { id: "crawl", label: "AI 크롤러 허용", desc: "robots.txt가 GPTBot·PerplexityBot을 막지 않습니다.", w: { chatgpt: 0, claude: 0.5, perplexity: 0.5, gemini: 1 } }
  ];
  const GEO_STATE = { checked: { name: true, table: true, faq: false, product: false, number: true, cite: false, link: true, crawl: true } };

  function geoData() {
    const brand = $("#gBrand").value.trim() || "내 브랜드";
    const cat = $("#gCat").value.trim() || "카테고리";
    const price = num("gPrice");
    const comps = $("#gComp").value.split(",").map((s) => s.trim()).filter(Boolean);
    const q = $("#gQ").value.trim() || cat + " 추천";
    const url = $("#gUrl").value.trim() || "";
    return { brand, cat, price, comps, q, url };
  }

  function buildGeo() {
    const d = geoData();
    // 체크리스트
    const cl = $("#gChecks");
    cl.innerHTML = GEO_CHECKS.map((c) =>
      '<label class="check-item"><input type="checkbox" data-geo="' + c.id + '"' + (GEO_STATE.checked[c.id] ? " checked" : "") + "><span><b>" + esc(c.label) + "</b><small>" + esc(c.desc) + "</small></span></label>"
    ).join("");
    $$("[data-geo]").forEach((cb) => cb.addEventListener("change", () => {
      GEO_STATE.checked[cb.dataset.geo] = cb.checked;
      scoreGeo();
    }));

    // 준비도
    const total = GEO_CHECKS.reduce((a, c) => a + 1, 0);
    const done = GEO_CHECKS.filter((c) => GEO_STATE.checked[c.id]).length;
    $("#gReady").textContent = Math.round((done / total) * 100) + "%";
    $("#gGauge").style.width = (done / total) * 100 + "%";

    // 플랫폼 예시 점수
    const plats = [["chatgpt", "ChatGPT"], ["claude", "Claude"], ["perplexity", "Perplexity"], ["gemini", "Gemini"]];
    $("#gPlatforms").innerHTML = plats.map(([k, nm]) => {
      let s = 0, mx = 0;
      GEO_CHECKS.forEach((c) => { const w = c.w[k] || 0; mx += w; if (GEO_STATE.checked[c.id]) s += w; });
      const v = mx > 0 ? Math.round((s / mx) * 100) : 0;
      const tier = v >= 80 ? "양호" : v >= 50 ? "보통" : "취약";
      return '<div class="sc"><span>' + nm + "</span><b>" + v + "</b><small>준비도 예시 · " + tier + "</small></div>";
    }).join("");

    // 비교표
    const compHead = d.comps.length ? d.comps : ["경쟁사 A", "경쟁사 B"];
    const cells = (v) => [v].concat(compHead.map(() => "확인 필요")).join(" | ");
    const table = [
      "| 항목 | " + d.brand + " | " + compHead.join(" | ") + " |",
      "| --- | " + ["---"].concat(compHead.map(() => "---")).join(" | ") + " |",
      "| 카테고리 | " + cells(d.cat) + " |",
      "| 가격 | " + cells(d.price ? d.price.toLocaleString("ko-KR") + "원" : "가격 입력") + " |",
      "| 소재 | " + cells("[소재 입력]") + " |",
      "| 구성 | " + cells("[구성·수량 입력]") + " |",
      "| 배송 | " + cells("[출고 기준 입력]") + " |",
      "| 특징 | " + cells("[차별점 1줄]") + " |",
      "| A/S | " + cells("[보증·교환 기준]") + " |"
    ].join("\n");
    $("#gTable").textContent = table;

    // FAQ
    const faqs = [
      { q: d.q + " — " + d.brand + "는 어떤 제품인가요?", a: d.brand + "는 " + d.cat + " 카테고리의 제품입니다. 핵심 특징은 [특징 1줄]이며, " + (d.price ? "판매가는 " + d.price.toLocaleString("ko-KR") + "원입니다." : "판매가는 판매처 페이지에서 확인할 수 있습니다.") },
      { q: d.cat + " 고를 때 무엇을 봐야 하나요?", a: "용도와 사용 인원, 소재, 세척·관리 방법을 먼저 확인하세요. 같은 카테고리라도 구성과 크기에 따라 만족도가 크게 갈립니다." },
      { q: d.brand + " 가격은 얼마인가요?", a: (d.price ? d.price.toLocaleString("ko-KR") + "원입니다. " : "가격은 판매처에서 확인해 주세요. ") + "구성과 배송 조건에 따라 달라질 수 있습니다." },
      { q: "배송은 얼마나 걸리나요?", a: "[출고 기준] 영업일 이내에 출고되며, 도서산간 지역은 하루에서 이틀 더 걸릴 수 있습니다." },
      { q: "선물 포장이 가능한가요?", a: "[가능/불가]합니다. 선물 포장을 선택하면 [구성]이 함께 제공됩니다." },
      { q: "교환·환불은 어떻게 하나요?", a: "수령 후 [기간] 이내에 교환·환불을 요청할 수 있습니다. 단순 변심의 경우 왕복 배송비가 발생하고, 상품 불량은 판매자 부담입니다." }
    ];
    $("#gFaq").innerHTML = faqs.map((f) => "<li><b>" + esc(f.q) + "</b><br>" + esc(f.a) + "</li>").join("");

    // JSON-LD
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          name: d.brand,
          category: d.cat,
          description: d.brand + " — " + d.cat + " · " + d.q,
          brand: { "@type": "Brand", name: d.brand.split(" ")[0] },
          offers: {
            "@type": "Offer",
            price: d.price || 0,
            priceCurrency: "KRW",
            availability: "https://schema.org/InStock",
            url: d.url || undefined
          }
        },
        {
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a }
          }))
        }
      ]
    };
    const json = JSON.stringify(ld, null, 2).replace(/</g, "\\u003c");
    $("#gJsonLd").textContent = '<script type="application/ld+json">\n' + json + "\n<\/script>";

    // 표기 통일
    const base = d.brand.replace(/\s+/g, "");
    const variants = [d.brand, base, d.brand.replace(/동곤\s*헬프스토어\s*/g, ""), d.brand.replace(/\s/g, "-")];
    $("#gNaming").innerHTML =
      '<div class="callout info">기준 표기: <b>' + esc(d.brand) + "</b> — 상세페이지·스마트스토어·쿠팡·보도자료·SNS 프로필 모두 이 표기로 통일하세요.</div>" +
      '<table class="tbl" style="margin-top:10px"><thead><tr><th>흔한 표기 흔들림</th><th>판정</th></tr></thead><tbody>' +
      variants.map((v, i) => "<tr><td>" + esc(v) + "</td><td>" + (i === 0 ? '<span class="pill-mini ok">기준</span>' : '<span class="pill-mini warn">통일 필요</span>') + "</td></tr>").join("") +
      "<tr><td>" + esc(d.brand.toUpperCase()) + "</td><td><span class='pill-mini warn'>영문 병기 시에만 사용</span></td></tr>" +
      "</tbody></table>" +
      '<p class="note" style="margin-top:8px">AI는 같은 브랜드가 여러 이름으로 흩어져 있으면 서로 다른 회사로 인식합니다. 판매처마다 상품명 앞에 브랜드명을 같은 순서로 붙이세요.</p>';
  }

  function scoreGeo() {
    const total = GEO_CHECKS.length;
    const done = GEO_CHECKS.filter((c) => GEO_STATE.checked[c.id]).length;
    $("#gReady").textContent = Math.round((done / total) * 100) + "%";
    $("#gGauge").style.width = (done / total) * 100 + "%";
    const plats = [["chatgpt", "ChatGPT"], ["claude", "Claude"], ["perplexity", "Perplexity"], ["gemini", "Gemini"]];
    $("#gPlatforms").innerHTML = plats.map(([k, nm]) => {
      let s = 0, mx = 0;
      GEO_CHECKS.forEach((c) => { const w = c.w[k] || 0; mx += w; if (GEO_STATE.checked[c.id]) s += w; });
      const v = mx > 0 ? Math.round((s / mx) * 100) : 0;
      const tier = v >= 80 ? "양호" : v >= 50 ? "보통" : "취약";
      return '<div class="sc"><span>' + nm + "</span><b>" + v + "</b><small>준비도 예시 · " + tier + "</small></div>";
    }).join("");
  }

  function initGeo() {
    buildGeo();
    ["gBrand", "gCat", "gPrice", "gComp", "gQ", "gUrl"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener("input", () => { buildGeo(); });
    });
  }

  /* ══════════════════════════════════════════
     6. 틈새 키워드 & 셀러 캘린더
     ══════════════════════════════════════════ */
  const TARGET_MODS = {
    "4050": ["부모님", "중년", "가정용", "실용", "50대"],
    single: ["1인용", "자취", "혼밥", "소용량", "원룸"],
    pet: ["반려동물", "강아지", "고양이", "펫", "털 안 묻는"],
    camp: ["캠핑", "차박", "휴대용", "경량", "야외"],
    newly: ["신혼", "집들이", "커플", "2인용", "인테리어"],
    office: ["사무실", "직장인", "책상", "출근", "오피스"],
    senior: ["어르신", "시니어", "부모님 선물", "가벼운", "큰 손잡이"]
  };

  function renderCalendar() {
    const now = new Date();
    $("#nToday").textContent = now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일 기준";
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    $("#nCal").innerHTML = monthNames.map((m, i) => {
      const mm = i + 1;
      const list = HS.SEASONS.filter((s) => s.month === mm);
      const heat = list.reduce((a, s) => Math.max(a, s.heat), 0);
      const nowCls = now.getMonth() + 1 === mm ? " now" : "";
      const names = list.map((s) => esc(s.name)).join(" · ") || "비수기 · 테스트";
      const leads = list.length ? list.map((s) => s.lead + "주 전 발주").join(" / ") : "신규 키워드 테스트";
      return '<div class="m' + nowCls + '"><div class="mm">' + m + "</div><div class='nm'>" + names + "</div><div class='lead'>" + leads + "</div>" +
        (heat ? '<div class="heat' + (heat >= 3 ? " hot" : "") + '">' + (heat >= 3 ? "피크" : "▲") + "</div>" : "") + "</div>";
    }).join("");

    // 다음 시즌 3개
    const now0 = new Date(); now0.setHours(0, 0, 0, 0);
    const cands = HS.SEASONS.map((s) => ({ s, d: HS.nextSeason(s, now0) })).filter((x) => x.d)
      .sort((a, b) => a.d - b.d).slice(0, 3);
    $("#nNext").innerHTML = cands.map(({ s, d }) => {
      const order = HS.addDays(d, -Math.round(s.lead * 7));
      const arrive = HS.addDays(d, -7);
      const dd = HS.dday(d);
      return '<div class="next-card"><div class="dday">D-' + dd + (dd <= 21 ? " · 지금 발주" : "") + "</div>" +
        "<h4>" + esc(s.name) + "</h4>" +
        "<dl><dt>피크</dt><dd>" + HS.fmtDate(d, true) + "</dd>" +
        "<dt>발주 마감</dt><dd>" + HS.fmtDate(order) + "</dd>" +
        "<dt>입고 목표</dt><dd>" + HS.fmtDate(arrive) + "</dd>" +
        "<dt>주력</dt><dd>" + esc(s.desc) + "</dd></dl></div>";
    }).join("");
    if (cands[0]) {
      const dd = HS.dday(cands[0].d);
      const el = $("#sumSeason");
      if (!window.__nextSeasonLabel || el.textContent === "—") {
        el.textContent = cands[0].s.name + " D-" + dd;
        el.className = dd <= 21 ? "bad" : dd <= 45 ? "warn" : "ok";
      }
    }
  }

  function genNiche() {
    const base = ($("#nProduct").value || "상품").trim();
    const tk = $("#nTarget").value;
    const targetLabel = $("#nTarget").selectedOptions[0].textContent;
    const angle = $("#nAngle").value;
    const mods = TARGET_MODS[tk] || TARGET_MODS["4050"];
    const now = new Date();
    const season = HS.SEASONS.map((s) => ({ s, d: HS.nextSeason(s, now) })).sort((a, b) => a.d - b.d)[0].s;
    const list = [];
    const push = (kw, type, intent, memo) => {
      const k = kw.replace(/\s+/g, " ").trim();
      if (!k || list.some((x) => x.kw === k)) return;
      list.push({ kw: k, type, intent, memo });
    };
    mods.forEach((m) => push(m + " " + base, "타겟 롱테일", m + " 고객", "전환 의도 높음"));
    mods.slice(0, 3).forEach((m) => push(base + " " + m, "타겟 롱테일", m + " 검색", "경쟁 보통"));
    ["가성비", "프리미엄", "대용량", "선물", "추천", "비교"].forEach((w) => push(angle + " " + base + " " + (w === angle ? "" : w), "구매 의도", w + " 비교", "전환 의도 높음"));
    push(season.name.replace(/\s/g, "") + " " + base, "시즌", season.name + " 선물", "D-" + HS.dday(HS.nextSeason(season, now)));
    push(season.name + " 선물 " + base, "시즌", season.name + " 선물", "시즌 한정");
    push(base + " 세트", "구성", "세트 구성", "객단가 상승");
    push(base + " 후기", "신뢰", "구매 전 확인", "경쟁 낮음");
    push(base + " 추천 " + targetLabel.split(" ")[0], "타겟 롱테일", "추천 비교", "경쟁 낮음");
    push(base + " 순위", "비교", "비교 검색", "경쟁 보통");
    push(base + " 할인", "가격", "가격 민감", "전환 의도 높음");
    const rows = list.slice(0, 24);
    $("#nList").innerHTML = rows.map((r) =>
      "<tr><td><b>" + esc(r.kw) + "</b></td><td><span class='pill-mini brand'>" + esc(r.type) + "</span></td><td class='small'>" + esc(r.intent) + "</td><td class='small'>" + esc(r.memo) + "</td></tr>"
    ).join("");
    window.__nicheCopy = rows.map((r) => r.kw).join("\n");
    toast(rows.length + "개 키워드 조합을 만들었습니다");
  }

  function initNiche() {
    renderCalendar();
    genNiche();
    $("#nGen").addEventListener("click", genNiche);
    $("#nTarget").addEventListener("change", genNiche);
    $("#nAngle").addEventListener("change", genNiche);
    $("#nCopy").addEventListener("click", () => copyText(window.__nicheCopy || "", "키워드 목록을 복사했습니다"));
    window.addEventListener("resize", () => { /* canvas는 CSS로 반응형 */ });
  }

  document.addEventListener("DOMContentLoaded", () => {
    try { initLeak(); } catch (e) { console.error("leak", e); }
    try { initStudio(); } catch (e) { console.error("studio", e); }
    try { initGeo(); } catch (e) { console.error("geo", e); }
    try { initNiche(); } catch (e) { console.error("niche", e); }
  });
})();
