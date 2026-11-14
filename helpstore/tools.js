/* 동곤 헬프스토어 PRO — tools: 마진 누수 / 스튜디오 / GEO / 캘린더 */
(function () {
  "use strict";
  const HS = window.HS;
  const { $, $$, DB, won, pct, num, numOrNull, esc, clamp, toast, copyText, parseNumber, fmtDate, addDays, dday, parseDate } = HS;

  /* ══════════════════════════════════════════
     3. 마진 누수
     ══════════════════════════════════════════ */
  function fillLeakProducts() {
    const sel = $("#mlProduct");
    if (!sel) return;
    sel.innerHTML = DB.products.map((p) => '<option value="' + p.id + '">' + esc(p.name) + " · " + (p.channel === "rocket" ? "로켓" : "위탁") + "</option>").join("");
  }
  function applyLeakProduct(id) {
    const p = HS.byId[id];
    if (!p) return;
    $("#mlPrice").value = p.sale;
    $("#mlSupply").value = p.supply;
    $("#mlFee").value = (DB.feeCats.find((f) => f.id === p.feeCat) || {}).rate || 10.56;
    const cfs = p.channel === "rocket" ? (p.cfsFee || 0) : 0;
    $("#mlRgLogi").value = cfs || "";
    $("#mlRgInout").value = "";
    $("#mlRgAd").value = "";
    $("#mlWingShip").value = "";
    $("#mlWingPack").value = "";
    $("#mlWingAd").value = "";
    renderLeak();
  }

  function channel(o) {
    const rev = o.price * o.qty;
    const cost = o.supply * o.qty;
    const fee = rev * o.fee / 100;
    const logi = o.logi * o.qty;
    const fixed = o.fixed || 0;
    const ad = o.ad || 0;
    const net = rev - cost - fee - logi - fixed - ad;
    return { rev, cost, fee, logi, fixed, ad, net, margin: rev > 0 ? net / rev * 100 : 0, perUnit: o.qty > 0 ? net / o.qty : 0 };
  }

  function renderLeak() {
    const price = num("mlPrice"), supply = num("mlSupply"), qty = Math.max(1, num("mlQty", 1)), feeRate = num("mlFee");
    const rg = channel({ price, supply, qty, fee: feeRate, logi: num("mlRgLogi"), fixed: numOrNull("mlRgInout") || 0, ad: numOrNull("mlRgAd") || 0 });
    const shipEntered = numOrNull("mlWingShip") !== null;
    const wg = channel({ price, supply, qty, fee: feeRate, logi: (numOrNull("mlWingShip") || 0) + (numOrNull("mlWingPack") || 0), fixed: 0, ad: numOrNull("mlWingAd") || 0 });

    const row = (label, a, b, diffFmt) => '<tr><td>' + label + '</td><td class="num">' + a + '</td><td class="num">' + b + "</td><td class='num small'>" + (diffFmt || "—") + "</td></tr>";
    $("#mlCompareBody").innerHTML =
      row("비교 수량", qty + "개", qty + "개") +
      row("매출", won(rg.rev), won(wg.rev)) +
      row("매입 원가", won(rg.cost), won(wg.cost)) +
      row("수수료 " + feeRate + "%", won(rg.fee), won(wg.fee)) +
      row("물류·배송", won(rg.logi), shipEntered ? won(wg.logi) : "미입력") +
      row("고정비(보관·포장)", won(rg.fixed), won(wg.fixed)) +
      row("광고비", won(rg.ad), won(wg.ad)) +
      '<tr class="total"><td>순이익</td><td class="num">' + won(rg.net) + '</td><td class="num">' + (shipEntered ? won(wg.net) : "—") + "</td><td class='num'>" + (shipEntered ? ((rg.net - wg.net) >= 0 ? "+" : "") + won(rg.net - wg.net) : "—") + "</td></tr>" +
      "<tr><td>마진율</td><td class='num'><b>" + pct(rg.margin) + "</b></td><td class='num'><b>" + (shipEntered ? pct(wg.margin) : "—") + "</b></td><td class='num'>" + (shipEntered ? (rg.margin - wg.margin >= 0 ? "+" : "") + (rg.margin - wg.margin).toFixed(1) + "%p" : "—") + "</td></tr>" +
      "<tr><td class='small'>건당 순이익</td><td class='num small'>" + won(rg.perUnit) + "</td><td class='num small'>" + (shipEntered ? won(wg.perUnit) : "—") + "</td><td class='num small'>—</td></tr>";

    const items = [
      ["수수료", rg.fee, wg.fee],
      ["물류·배송", rg.logi, wg.logi],
      ["고정비", rg.fixed, wg.fixed],
      ["광고비", rg.ad, wg.ad]
    ];
    $("#mlLossBody").innerHTML = items.map((x) => {
      const diff = x[1] - x[2];
      const cls = diff > 0 ? "bad" : diff < 0 ? "ok" : "gray";
      return "<tr><td>" + x[0] + '</td><td class="num">' + won(x[1]) + '</td><td class="num">' + (shipEntered || x[0] === "수수료" ? won(x[2]) : "미입력") + "</td><td class='num'><span class='pill-mini " + cls + "'>" + (diff > 0 ? "+" : "") + won(diff) + "</span></td></tr>";
    }).join("") +
      '<tr class="total"><td>합계</td><td class="num">' + won(rg.fee + rg.logi + rg.fixed + rg.ad) + '</td><td class="num">' + won(wg.fee + wg.logi + wg.fixed + wg.ad) + "</td><td class='num'>" + won((rg.fee + rg.logi + rg.fixed + rg.ad) - (wg.fee + wg.logi + wg.fixed + wg.ad)) + "</td></tr>";

    window.__leak = { price, supply, qty, feeRate, rg, wg, product: (HS.byId[$("#mlProduct").value] || {}).name || "직접 입력" };

    const badge = $("#mlVerdict"), sum = $("#mlSummary"), acts = $("#mlActions");
    if (!shipEntered) {
      badge.textContent = "택배비 입력 필요";
      badge.className = "right badge warn";
      sum.className = "callout warn";
      sum.innerHTML = "판매자배송 택배 계약 단가가 DB에 없어 비교를 멈췄습니다. <b>건당 택배비를 입력</b>하면 그때 두 채널을 1:1로 비교합니다. (현재 로켓그로스만 " + pct(rg.margin) + " · 건당 " + won(rg.perUnit) + ")";
      acts.innerHTML = "<li>판매자배송 택배 계약 단가(건당)를 입력하세요. 위탁·산지직송 상품은 공급가에 배송비가 포함돼 있어 택배비 0원으로 두면 됩니다.</li><li>광고비는 쿠팡 광고센터의 실제 월 지출을 넣어야 정확합니다. 비우면 0원으로 계산됩니다.</li>";
      return;
    }
    const diff = rg.net - wg.net;
    const winner = diff >= 0 ? "로켓그로스" : "판매자배송";
    badge.textContent = winner + " 우세 · " + Math.abs(rg.margin - wg.margin).toFixed(1) + "%p";
    badge.className = "right badge " + (Math.abs(rg.margin - wg.margin) > 3 ? "ok" : "gray");

    const losses = items.map((x) => ({ name: x[0], loss: x[1] - x[2] })).filter((x) => x.loss > 0).sort((a, b) => b.loss - a.loss);
    const totalLoss = losses.reduce((a, b) => a + b.loss, 0);
    sum.className = "callout " + (Math.abs(diff) > 0 ? "warn" : "info");
    sum.innerHTML = "같은 상품·같은 판매가에서 " + (diff >= 0 ? "로켓그로스가" : "판매자배송이") + " " + qty + "개 기준 <b>" + won(Math.abs(diff)) + "</b> 더 남습니다. " +
      (totalLoss > 0 && losses.length ? "가장 큰 누수는 <b>" + losses[0].name + " " + won(losses[0].loss) + "</b>(전체 차이의 " + Math.round(losses[0].loss / totalLoss * 100) + "%)입니다." : "입력한 비용 항목 차이가 없습니다.");

    const list = [];
    if (numOrNull("mlRgInout") === null && numOrNull("mlWingPack") === null) list.push("보관·입출고비와 포장비가 비어 있어 0원으로 계산했습니다. 실제 청구서 값을 넣어야 채널 비교가 맞습니다.");
    if ((numOrNull("mlRgAd") || 0) + (numOrNull("mlWingAd") || 0) === 0) list.push("광고비가 0원입니다. 광고를 켠 채널이라면 광고센터 월 지출을 넣으세요. 마진이 가장 크게 새는 항목이 광고비인 경우가 많습니다.");
    list.push(diff >= 0 ? "판매자배송의 택배·포장 단가를 실제 계약서로 확인하세요. 계약 단가가 낮아지면 결론이 뒤집힐 수 있습니다." : "로켓그로스의 CFS 등급을 한 단계 낮출 수 있는지(포장 압축·부피 축소) 확인하세요.");
    const biggest = losses[0];
    if (biggest) list.push(biggest.name + "에서 " + won(biggest.loss) + " 차이가 납니다. 이 항목을 먼저 협상하거나 줄이면 " + qty + "개 기준 마진이 그만큼 회복됩니다.");
    acts.innerHTML = list.slice(0, 3).map((s) => "<li>" + s + "</li>").join("");
  }

  /* 정산 CSV */
  const SETTLE_ALIAS = {
    product: ["상품명", "상품", "품명", "product", "name", "item"],
    channel: ["배송유형", "배송", "채널", "channel", "type", "배송방법"],
    price: ["판매가", "단가", "price"],
    qty: ["수량", "판매수량", "qty", "quantity"],
    rev: ["매출", "매출액", "revenue", "sales"],
    fee: ["수수료", "수수료비", "fee"],
    logi: ["물류비", "택배비", "logistics", "shipping", "배송비"],
    ad: ["광고비", "ad", "adcost"],
    cost: ["원가", "상품원가", "매입가", "cost"]
  };
  const normHead = (h) => String(h).toLowerCase().replace(/[\s()\-_/.]/g, "");
  function settleKey(h) {
    const n = normHead(h);
    if (!n) return null;
    for (const k of Object.keys(SETTLE_ALIAS)) for (const a of SETTLE_ALIAS[k]) if (n === normHead(a)) return k;
    for (const k of Object.keys(SETTLE_ALIAS)) for (const a of SETTLE_ALIAS[k]) {
      const na = normHead(a);
      if (na.length > 1 && (n.indexOf(na) === 0 || na.indexOf(n) === 0)) return k;
    }
    return null;
  }
  function splitCsvLine(line, d) {
    const out = []; let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { q = !q; continue; }
      if (c === d && !q) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur); return out;
  }
  function parseSettle(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (!lines.length) return { rows: [], error: "데이터가 없습니다." };
    const d = (lines[0].match(/\t/g) || []).length >= (lines[0].match(/,/g) || []).length ? "\t" : ",";
    const head = splitCsvLine(lines[0], d).map((s) => s.trim());
    const map = {};
    head.forEach((h, i) => { const k = settleKey(h); if (k && map[k] === undefined) map[k] = i; });
    if (map.product === undefined || map.rev === undefined) return { rows: [], error: "상품명·매출 컬럼을 찾지 못했습니다. 머리글을 넣고 다시 붙여넣어 주세요." };
    const missing = ["fee", "logi", "ad", "cost"].filter((k) => map[k] === undefined);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const c = splitCsvLine(lines[i], d);
      const name = (c[map.product] || "").trim();
      if (!name) continue;
      const rev = parseNumber(c[map.rev]);
      const fee = map.fee !== undefined ? parseNumber(c[map.fee]) : 0;
      const logi = map.logi !== undefined ? parseNumber(c[map.logi]) : 0;
      const ad = map.ad !== undefined ? parseNumber(c[map.ad]) : 0;
      const cost = map.cost !== undefined ? parseNumber(c[map.cost]) : 0;
      const net = rev - fee - logi - ad - cost;
      rows.push({ name, channel: (c[map.channel] || "—").trim(), qty: parseNumber(c[map.qty]), rev, fee, logi, ad, cost, net, margin: rev > 0 ? net / rev * 100 : 0 });
    }
    return { rows, missing, error: rows.length ? null : "행을 읽지 못했습니다." };
  }

  function renderSettle() {
    const parsed = parseSettle($("#mlCsv").value);
    if (parsed.error) {
      toast(parsed.error);
      $("#mlCsvBadge").textContent = "오류"; $("#mlCsvBadge").className = "right badge bad";
      return;
    }
    const rows = parsed.rows.sort((a, b) => a.margin - b.margin);
    $("#mlCsvBody").innerHTML = rows.map((r) => {
      const cls = r.margin < 0 ? "bad" : r.margin < 10 ? "warn" : "ok";
      return "<tr><td><b>" + esc(r.name) + "</b><div class='small'>" + won(r.rev) + (r.qty ? " / " + r.qty + "개" : "") + "</div></td>" +
        "<td class='small'>" + esc(r.channel) + "</td><td class='num'>" + won(r.rev) + "</td>" +
        "<td class='num small'>" + won(r.fee + r.logi + r.ad + r.cost) + "</td>" +
        "<td class='num'><b>" + won(r.net) + "</b></td>" +
        "<td class='num'><span class='pill-mini " + cls + "'>" + pct(r.margin) + "</span></td></tr>";
    }).join("");

    const agg = rows.reduce((a, r) => ({ rev: a.rev + r.rev, net: a.net + r.net, ad: a.ad + r.ad }), { rev: 0, net: 0, ad: 0 });
    const overall = agg.rev > 0 ? agg.net / agg.rev * 100 : 0;
    const worst = rows[0];
    const badge = $("#mlCsvBadge");
    badge.textContent = "마진 " + pct(overall);
    badge.className = "right badge " + (overall >= 20 ? "ok" : overall >= 10 ? "warn" : "bad");

    const sum = $("#mlCsvSummary");
    sum.className = "callout " + (overall >= 20 ? "ok" : "warn");
    sum.innerHTML = "전체 마진율 <b>" + pct(overall) + "</b>, 광고비 비중 " + pct(agg.rev > 0 ? agg.ad / agg.rev * 100 : 0) + ". 가장 나쁜 상품은 <b>" + esc(worst.name) + " " + esc(worst.channel) + "</b> 마진 " + pct(worst.margin) + "(" + won(worst.net) + ")입니다." +
      (parsed.missing.length ? " <br>컬럼 누락: " + parsed.missing.map((k) => ({ fee: "수수료", logi: "물류비", ad: "광고비", cost: "원가" }[k])).join(", ") + " → 0으로 계산했습니다." : "");

    const acts = [];
    if (worst.margin < 0) acts.push("<b>" + esc(worst.name) + "</b>가 " + won(worst.net) + " 적자입니다. 광고를 끄거나 판매가를 " + won(Math.abs(worst.net) / Math.max(worst.qty, 1)) + " 이상 올려야 손익분기가 맞습니다.");
    if (agg.rev > 0 && agg.ad / agg.rev > 0.08) acts.push("광고비가 매출의 " + pct(agg.ad / agg.rev * 100) + "입니다. 광고 분석 탭에서 주문 0원 키워드를 먼저 끄세요.");
    if (parsed.missing.length) acts.push("정산서에 " + parsed.missing.map((k) => ({ fee: "수수료", logi: "물류비", ad: "광고비", cost: "원가" }[k])).join("·") + " 컬럼이 없어 0원 처리했습니다. 그 항목이 빠지면 마진이 실제보다 좋게 보입니다.");
    while (acts.length < 2) acts.push("주 단위로 같은 정산서를 다시 돌려 마진율 변화를 추적하세요.");
    $("#mlCsvActions").innerHTML = acts.slice(0, 3).map((s) => "<li>" + s + "</li>").join("");
    window.__settle = rows;
    toast(rows.length + "개 상품을 진단했습니다");
  }

  function initLeak() {
    fillLeakProducts();
    ["mlPrice", "mlSupply", "mlQty", "mlFee", "mlRgLogi", "mlRgInout", "mlRgAd", "mlWingShip", "mlWingPack", "mlWingAd"]
      .forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener("input", renderLeak); });
    $("#mlProduct").addEventListener("change", () => applyLeakProduct($("#mlProduct").value));
    applyLeakProduct(DB.products[0].id);
    $$("#mlTabs button").forEach((b) => b.addEventListener("click", () => {
      $$("#mlTabs button").forEach((x) => x.classList.toggle("active", x === b));
      $("#mlPaneCompare").classList.toggle("hidden", b.dataset.mltab !== "compare");
      $("#mlPaneCsv").classList.toggle("hidden", b.dataset.mltab !== "csv");
    }));
    $("#mlCsvTemplate").addEventListener("click", () => {
      $("#mlCsv").value = "상품명,배송유형,판매가,수량,매출,수수료,물류비,광고비,원가\n";
      toast("머리글을 넣었습니다. 정산서 표를 그대로 붙여넣으세요");
    });
    $("#mlCsvRun").addEventListener("click", renderSettle);
    $("#mlCsvClear").addEventListener("click", () => {
      $("#mlCsv").value = "";
      $("#mlCsvBody").innerHTML = '<tr><td colspan="6" class="note">정산 데이터를 붙여넣으세요.</td></tr>';
      $("#mlCsvBadge").textContent = "대기"; $("#mlCsvBadge").className = "right badge gray";
      $("#mlCsvSummary").textContent = "진단 전입니다.";
      $("#mlCsvActions").innerHTML = '<li class="note">진단 후 생성됩니다.</li>';
    });
    $("#btnSaveLeak").addEventListener("click", () => {
      const l = window.__leak;
      if (!l) { toast("조건을 먼저 입력하세요"); return; }
      window.HSStore.add({
        type: "leak", title: l.product + " · 로켓 " + l.rg.margin.toFixed(1) + "% / 직송 " + (numOrNull("mlWingShip") !== null ? l.wg.margin.toFixed(1) + "%" : "미입력"),
        data: {
          product: l.product, qty: l.qty, price: l.price, supply: l.supply,
          rgMargin: +l.rg.margin.toFixed(1), wgMargin: +l.wg.margin.toFixed(1),
          rgNet: Math.round(l.rg.net), wgNet: Math.round(l.wg.net),
          rgCost: { fee: Math.round(l.rg.fee), logi: Math.round(l.rg.logi), fixed: Math.round(l.rg.fixed), ad: Math.round(l.rg.ad) },
          wgCost: { fee: Math.round(l.wg.fee), logi: Math.round(l.wg.logi), fixed: 0, ad: Math.round(l.wg.ad) },
          wingShipEntered: numOrNull("mlWingShip") !== null
        }
      });
      toast("진단을 저장했습니다");
    });
  }

  /* ══════════════════════════════════════════
     4. 상세페이지 스튜디오
     ══════════════════════════════════════════ */
  const BG = {
    ivory: { from: "#fdfcf8", to: "#ece5d8", ink: "#1b1a17", sub: "#6b6459" },
    slate: { from: "#f5f8fc", to: "#dbe4ee", ink: "#101d2e", sub: "#5b6b7d" },
    sand: { from: "#f8f0e7", to: "#e6d2b9", ink: "#231b12", sub: "#7a6a56" },
    mint: { from: "#f0faf6", to: "#d3eee2", ink: "#0f2620", sub: "#4f6f64" },
    night: { from: "#232f3f", to: "#0a1119", ink: "#f8fafc", sub: "#cbd5e1" }
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
  function wrapText(ctx, text, maxW, maxLines) {
    const words = String(text).split(" ");
    const lines = []; let cur = "";
    words.forEach((w) => {
      const t = cur ? cur + " " + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
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
    x.fillStyle = "rgba(255,255,255,.35)"; rr(x, 240, 205, 26, 580, 13); x.fill();
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

    const rg = ctx.createRadialGradient(W * 0.5, H * 0.36, 40, W * 0.5, H * 0.36, W * 0.68);
    rg.addColorStop(0, studio.bg === "night" ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.85)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    const box = story ? { x: 110, y: 150, w: 860, h: 620 } : { x: 120, y: 150, w: 840, h: 560 };
    if (studio.img) {
      const iw = studio.img.width || 720, ih = studio.img.height || 900;
      const s = Math.min(box.w / iw, box.h / ih);
      const dw = iw * s, dh = ih * s;
      const dx = box.x + (box.w - dw) / 2, dy = box.y + (box.h - dh) / 2;
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
      ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
      ctx.drawImage(studio.img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.08)" : "rgba(15,23,42,.05)";
      rr(ctx, box.x + 120, box.y + 60, box.w - 240, box.h - 120, 24); ctx.fill();
      ctx.fillStyle = b.sub;
      ctx.font = '600 26px Pretendard, "Malgun Gothic", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("제품 이미지를 올려 주세요", W / 2, box.y + box.h / 2);
      ctx.restore();
    }

    if (studio.badge) {
      ctx.save();
      ctx.font = '800 26px Pretendard, "Malgun Gothic", sans-serif';
      const tw = ctx.measureText(studio.badge).width;
      const bw = tw + 52, bh = 56;
      ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.94)" : "rgba(15,23,42,.9)";
      rr(ctx, 64, 58, bw, bh, 28); ctx.fill();
      ctx.fillStyle = studio.bg === "night" ? "#0f172a" : "#ffffff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(studio.badge, 64 + bw / 2, 59 + bh / 2);
      ctx.restore();
    }

    ctx.save();
    ctx.font = '700 20px Pretendard, "Malgun Gothic", sans-serif';
    ctx.fillStyle = b.sub; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillText("동곤 헬프스토어 PRO", W - 64, 84);
    ctx.restore();

    const headline = $("#stHeadline").value.trim() || "제품의 핵심을 한 줄로";
    const subline = $("#stSubline").value.trim();
    const textTop = story ? 900 : 760;
    ctx.save();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = b.ink;
    ctx.font = '800 54px Pretendard, "Malgun Gothic", sans-serif';
    const lines = wrapText(ctx, headline, W - 128, 2);
    lines.forEach((ln, i) => ctx.fillText(ln, 64, textTop + i * 66));
    let y = textTop + lines.length * 66;
    if (subline) {
      ctx.font = '600 30px Pretendard, "Malgun Gothic", sans-serif';
      ctx.fillStyle = b.sub;
      wrapText(ctx, subline, W - 128, 1).forEach((ln) => { y += 16; ctx.fillText(ln, 64, y + 26); y += 26; });
    }
    ctx.fillStyle = studio.bg === "night" ? "rgba(255,255,255,.25)" : "rgba(15,23,42,.14)";
    ctx.fillRect(64, H - 92, 64, 3);
    ctx.font = '600 20px Pretendard, "Malgun Gothic", sans-serif';
    ctx.fillStyle = b.sub;
    ctx.fillText("free · unlimited seller tools", 64, H - 56);
    ctx.restore();

    if (studio.frame === "thin") {
      ctx.save();
      ctx.strokeStyle = studio.bg === "night" ? "rgba(255,255,255,.35)" : "rgba(15,23,42,.22)";
      ctx.lineWidth = 2; ctx.strokeRect(28, 28, W - 56, H - 56);
      ctx.restore();
    } else if (studio.frame === "gold") {
      ctx.save();
      const fg = ctx.createLinearGradient(0, 0, W, H);
      fg.addColorStop(0, "#d8b06a"); fg.addColorStop(0.5, "#f3e2bc"); fg.addColorStop(1, "#b98d47");
      ctx.strokeStyle = fg; ctx.lineWidth = 8; ctx.strokeRect(30, 30, W - 60, H - 60);
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(216,176,106,.45)"; ctx.strokeRect(48, 48, W - 96, H - 96);
      ctx.restore();
    }
  }

  function initStudio() {
    const p = DB.products[4] || DB.products[0];
    $("#stHeadline").value = p.name;
    $("#stSubline").value = "산지직송 · 파손 시 사진 1장으로 무수거 재발송";
    $("#cName").value = p.name;
    $("#cTarget").value = "40~50대 가정용 구매자";
    $("#cPoints").value = [
      "산지에서 바로 보내는 " + p.name,
      "박스당 5개 이상 브릭스 측정, 평균 13 이상 선별",
      "파손·무름은 사진 1장으로 무수거 환불·재발송"
    ].join("\n");
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
      e.preventDefault(); $("#stDrop").classList.remove("over");
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
        drawScene(); URL.revokeObjectURL(url);
        toast("이미지를 올렸습니다");
      };
      im.onerror = () => toast("이미지를 읽지 못했습니다");
      im.src = url;
    }
    $("#stDemoImg").addEventListener("click", () => {
      studio.img = demoProduct();
      $("#stFileNote").textContent = "도형 예시로 배치를 확인 중입니다. 내 이미지를 올리면 교체됩니다.";
      drawScene();
    });

    $("#stDownload").addEventListener("click", () => {
      drawScene();
      const cv = $("#stCanvas");
      const name = "helpstore-" + (studio.format === "story" ? "cardnews-1080x1350" : "artwork-1080x1080") + ".png";
      if (cv.toBlob) {
        cv.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = name; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 3000);
          toast("PNG를 저장했습니다");
        }, "image/png");
      } else {
        const a = document.createElement("a");
        a.href = cv.toDataURL("image/png"); a.download = name; a.click();
      }
    });

    $("#cGen").addEventListener("click", genCopy);
    $("#cCopy").addEventListener("click", () => {
      if (!window.__copyPlain) { toast("먼저 카피를 생성하세요"); return; }
      copyText(window.__copyPlain, "상세페이지 카피를 복사했습니다");
    });
    genCopy();
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
      { h: "1. 메인 헤드라인", lines: [name, p1] },
      { h: "2. 공감 도입", paras: [
        target + "라면 한 번쯤 겪어 보셨을 겁니다. 사진은 그럴듯한데 막상 손이 가지 않는 물건.",
        "이 제품은 그 지점부터 다르게 잡았습니다. " + p1 + ".",
        p2 + (pts[2] ? ", " + p3 : "") + " — 받는 날부터 바로 쓰실 수 있습니다."
      ] },
      { h: "3. 사용 장면", lead: "사진이 아니라 장면으로 보여 주세요. 세 가지면 충분합니다.", items: [
        "아침 준비: 정신없는 아침, 이 제품을 꺼내는 순간 준비가 한 단계 줄어듭니다. " + p1 + ".",
        "주말 저녁: " + target + "에게 가장 편한 시간입니다. " + (pts[1] || "손이 자주 가는 자리에 두고 씁니다") + ".",
        "선물하는 날: 포장을 열었을 때의 반응까지 계산했습니다. " + (pts[2] || "안내 카드와 함께 보내드립니다") + "."
      ] },
      { h: "4. 출고·품질 신뢰", paras: [
        "후기가 아닌 출고 과정으로 보여드립니다.",
        p2 + ". " + (pts[2] || "파손 없이 도착하도록 내부 완충재로 나누어 담습니다") + ". 문의는 확인하는 대로 순서대로 답변드립니다."
      ] }
    ];
    $("#cOut").innerHTML = steps.map((s) => {
      let inner = "";
      if (s.lines) inner += s.lines.map((l, i) => i === 0 ? "<p><b>" + esc(l) + "</b></p>" : "<p>" + esc(l) + "</p>").join("");
      if (s.lead) inner += "<p>" + esc(s.lead) + "</p>";
      if (s.paras) inner += s.paras.map((p) => "<p>" + esc(p) + "</p>").join("");
      if (s.items) inner += "<ul>" + s.items.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>";
      return '<div class="step"><h4>' + s.h + "</h4>" + inner + "</div>";
    }).join("");
    window.__copyPlain = steps.map((s) => {
      let t = "[" + s.h + "]\n";
      if (s.lines) t += s.lines.join("\n") + "\n";
      if (s.lead) t += s.lead + "\n";
      if (s.paras) t += s.paras.join("\n") + "\n";
      if (s.items) t += s.items.map((i) => "- " + i).join("\n") + "\n";
      return t;
    }).join("\n");
  }

  /* ══════════════════════════════════════════
     5. GEO 스키마
     ══════════════════════════════════════════ */
  const GEO = { domain: DB.domains[0].url };

  function fillGeo() {
    const sel = $("#gDomain");
    sel.innerHTML = DB.domains.map((d) => '<option value="' + esc(d.url) + '">' + esc(d.name) + " — " + esc(d.host) + "</option>").join("") +
      '<option value="custom">직접 입력</option>';
    sel.addEventListener("change", () => {
      const d = DB.domains.find((x) => x.url === sel.value);
      if (d) {
        $("#gUrl").value = d.url;
        $("#gName").value = d.name;
        $("#gBrand").value = d.name;
        $("#gCat").value = d.desc;
        $("#gType").value = d.url.indexOf("jalitji") >= 0 ? "app" : (d.name === "공매물" ? "org" : "article");
        build();
      }
    });
    const d0 = DB.domains[0];
    $("#gUrl").value = d0.url;
    $("#gName").value = d0.name;
    $("#gBrand").value = d0.name;
    $("#gCat").value = d0.desc;
    $("#gType").value = "org";
    build();
  }

  function geoInputs() {
    return {
      domain: $("#gDomain").value,
      type: $("#gType").value,
      url: $("#gUrl").value.trim(),
      name: $("#gName").value.trim(),
      cat: $("#gCat").value.trim(),
      price: numOrNull("gPrice"),
      q: $("#gQ").value.trim(),
      comps: $("#gComp").value.split(",").map((s) => s.trim()).filter(Boolean),
      brand: $("#gBrand").value.trim()
    };
  }

  function build() {
    const v = geoInputs();
    const graph = [];
    const desc = v.cat || (v.name + " 안내 페이지");

    if (v.type === "product") {
      graph.push({
        "@type": "Product", name: v.name, description: desc, url: v.url, category: v.cat,
        brand: { "@type": "Brand", name: v.brand || v.name },
        offers: { "@type": "Offer", price: v.price || 0, priceCurrency: "KRW", availability: "https://schema.org/InStock", url: v.url }
      });
    } else if (v.type === "app") {
      graph.push({
        "@type": "SoftwareApplication", name: v.name, description: desc, url: v.url,
        applicationCategory: "LifestyleApplication", operatingSystem: "iOS, Android",
        offers: { "@type": "Offer", price: 0, priceCurrency: "KRW" }
      });
    } else if (v.type === "article") {
      graph.push({ "@type": "Article", headline: v.name, description: desc, url: v.url, author: { "@type": "Organization", name: v.brand || v.name }, publisher: { "@type": "Organization", name: v.brand || v.name } });
    } else {
      graph.push({ "@type": "Organization", name: v.name, description: desc, url: v.url });
    }

    const faqs = buildFaq(v);
    if (faqs.length) graph.push({ "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
    graph.push({ "@type": "WebSite", name: v.name, url: v.url });

    const ld = { "@context": "https://schema.org", "@graph": graph };
    const json = JSON.stringify(ld, null, 2).replace(/</g, "\\u003c");
    const code = '<script type="application/ld+json">\n' + json + "\n<\/script>";
    $("#gJsonLd").textContent = code;
    $("#gJsonLen").textContent = new Blob([json]).size.toLocaleString("ko-KR") + " bytes";

    validate(v, json, faqs);

    // 비교표
    const comps = v.comps.length ? v.comps : ["경쟁사 A", "경쟁사 B"];
    const cell = (val) => [val].concat(comps.map(() => "확인 필요")).join(" | ");
    $("#gTable").textContent = [
      "| 항목 | " + v.name + " | " + comps.join(" | ") + " |",
      "| --- | " + ["---"].concat(comps.map(() => "---")).join(" | ") + " |",
      "| 카테고리 | " + cell(v.cat || "확인 필요") + " |",
      "| 가격 | " + cell(v.price ? v.price.toLocaleString("ko-KR") + "원" : "확인 필요") + " |",
      "| 제공 형태 | " + cell("확인 필요") + " |",
      "| 배송·이용 | " + cell("확인 필요") + " |",
      "| 차별점 | " + cell("확인 필요") + " |"
    ].join("\n");

    // FAQ 초안
    $("#gFaq").innerHTML = faqs.map((f) => "<li><b>" + esc(f.q) + "</b><br>" + esc(f.a) + "</li>").join("");

    // AI 링크
    const q = v.q || (v.name + " 추천");
    const links = [
      ["ChatGPT", "https://chatgpt.com/?q=" + encodeURIComponent(q)],
      ["Perplexity", "https://www.perplexity.ai/search?q=" + encodeURIComponent(q)],
      ["Claude", "https://claude.ai/new?q=" + encodeURIComponent(q)],
      ["Gemini", "https://gemini.google.com/app"]
    ];
    $("#aiLinks").innerHTML = links.map((l) => '<a class="btn sm" href="' + l[1] + '" target="_blank" rel="noopener">' + l[0] + "에서 보기</a>").join("") +
      '<button class="btn sm ghost" id="copyQ" type="button">질문 복사</button>';
    const cq = $("#copyQ");
    if (cq) cq.addEventListener("click", () => copyText(q, "질문을 복사했습니다"));

    window.__geoQ = q;
  }

  function buildFaq(v) {
    const faqs = [];
    const name = v.name || "이 서비스";
    faqs.push({ q: name + "은 무엇인가요?", a: v.cat ? v.cat + "입니다. 자세한 기능과 이용 방법은 " + (v.url || "공식 페이지") + "에서 확인할 수 있습니다." : name + "에 대한 설명이 아직 입력되지 않았습니다. 카테고리·설명을 채워 주세요." });
    if (v.type === "product") faqs.push({ q: name + " 가격은 얼마인가요?", a: v.price ? v.price.toLocaleString("ko-KR") + "원입니다. 옵션과 배송 조건에 따라 달라질 수 있습니다." : "가격은 판매 페이지에서 확인해 주세요." });
    if (v.type === "app") faqs.push({ q: name + "은 어떤 기기에서 쓸 수 있나요?", a: "iOS와 Android에서 사용할 수 있습니다. 설치와 이용은 무료입니다." });
    faqs.push({ q: name + "은 어디서 이용할 수 있나요?", a: (v.url || "공식 페이지") + "에서 바로 이용할 수 있습니다." });
    faqs.push({ q: "이용 요금이나 배송비가 있나요?", a: v.price ? "상품 가격은 " + v.price.toLocaleString("ko-KR") + "원이며, 배송비는 판매처 정책을 따릅니다." : "이용 조건과 비용은 공식 페이지의 안내를 따릅니다." });
    faqs.push({ q: "문의는 어떻게 하나요?", a: (v.brand || name) + " 공식 페이지의 문의 채널을 이용해 주세요." });
    return faqs;
  }

  function validate(v, json, faqs) {
    const rows = [];
    const add = (ok, label, detail) => rows.push({ ok, label, detail });
    let parsed = null;
    try { parsed = JSON.parse(json); } catch (e) { /* noop */ }
    add(!!parsed && !!parsed["@graph"], "JSON 구조", parsed ? "@graph 노드 " + parsed["@graph"].length + "개" : "JSON 파싱 실패");
    add(!!v.name, "이름(name)", v.name || "비어 있음");
    add(/^https:\/\//.test(v.url), "URL(https)", v.url || "비어 있음");
    add(!v.domain || v.domain === "custom" || v.url.indexOf(v.domain.replace(/^https?:\/\//, "").split("/")[0]) >= 0, "도메인 일치", v.domain === "custom" ? "직접 입력" : v.domain);
    if (v.type === "product") add(v.price !== null && v.price > 0, "가격(price)", v.price ? v.price.toLocaleString("ko-KR") + "원" : "상품인데 가격이 비어 있음");
    if (v.type === "app") add(true, "운영체제", "iOS, Android");
    add((v.cat || "").length >= 8, "설명 길이", (v.cat || "").length + "자 (8자 이상 권장)");
    const qs = faqs.map((f) => f.q);
    add(new Set(qs).size === qs.length, "FAQ 중복", qs.length + "문항 / 중복 " + (qs.length - new Set(qs).size) + "건");
    const shortAnswers = faqs.filter((f) => f.a.length < 20).length;
    add(shortAnswers === 0, "FAQ 답변 길이", shortAnswers ? shortAnswers + "개가 20자 미만" : "모두 20자 이상");
    const placeholder = /\{\{|\[[^\]]*입력[^\]]*\]|TODO/.test(json);
    add(!placeholder, "자리표시자", placeholder ? "입력용 대괄호가 남아 있습니다" : "없음");
    const okCount = rows.filter((r) => r.ok).length;
    const bad = rows.length - okCount;
    const badge = $("#gValidateBadge");
    badge.textContent = "통과 " + okCount + " · 경고 " + bad;
    badge.className = "right badge " + (bad === 0 ? "ok" : bad <= 2 ? "warn" : "bad");
    $("#gChecks").innerHTML = '<div class="checklist">' + rows.map((r) =>
      '<div class="check-item"><span style="width:15px">' + (r.ok ? "✅" : "⚠️") + "</span><span><b>" + esc(r.label) + "</b><small>" + esc(r.detail) + "</small></span></div>"
    ).join("") + "</div>";
  }

  function initGeo() {
    fillGeo();
    ["gType", "gUrl", "gName", "gCat", "gPrice", "gQ", "gComp", "gBrand"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener("input", build);
      el.addEventListener("change", build);
    });
    $("#gRun").addEventListener("click", () => { build(); toast("스키마를 생성하고 검사했습니다"); });

    // 자동완성
    const q = () => window.__geoQ || $("#gName").value || "";
    const renderAcLinks = () => {
      const query = encodeURIComponent(q());
      $("#acLinks").innerHTML =
        '<a class="btn sm" href="https://search.naver.com/search.naver?query=' + query + '" target="_blank" rel="noopener">네이버 검색</a>' +
        '<a class="btn sm" href="https://www.google.com/search?q=' + query + '&hl=ko" target="_blank" rel="noopener">구글 검색</a>' +
        '<a class="btn sm" href="https://www.coupang.com/np/search?q=' + query + '" target="_blank" rel="noopener">쿠팡 검색</a>' +
        '<a class="btn sm" href="https://ads.naver.com/" target="_blank" rel="noopener">네이버 키워드도구</a>';
    };
    renderAcLinks();
    $("#gRun").addEventListener("click", renderAcLinks);
    $("#acRun").addEventListener("click", () => {
      const lines = $("#acSource").value.split("\n").map((s) => s.replace(/^[\s\-•\d.]+/, "").trim()).filter(Boolean);
      const uniq = Array.from(new Set(lines));
      if (!uniq.length) { toast("자동완성 결과를 붙여넣어 주세요"); return; }
      const brandTokens = (($("#gBrand").value || "") + " " + ($("#gName").value || "")).split(/\s+/).filter((t) => t.length > 1);
      $("#acList").innerHTML = uniq.map((k) => {
        const words = k.split(/\s+/).length;
        const type = brandTokens.some((t) => k.indexOf(t) >= 0) ? "브랜드 포함" : words >= 3 ? "롱테일" : "미들";
        return "<tr><td><b>" + esc(k) + '</b></td><td class="num">' + k.length + '</td><td class="num">' + words + "</td><td><span class='pill-mini brand'>" + type + "</span></td></tr>";
      }).join("");
      window.__acCopy = uniq.join("\n");
      toast(uniq.length + "개를 정리했습니다");
    });
    $("#acCopy").addEventListener("click", () => copyText(window.__acCopy || "", "키워드 목록을 복사했습니다"));
  }

  /* ══════════════════════════════════════════
     6. 틈새 키워드 & 캘린더
     ══════════════════════════════════════════ */
  function renderCalendar() {
    const now = new Date();
    $("#nToday").textContent = now.getFullYear() + "년 " + (now.getMonth() + 1) + "월 " + now.getDate() + "일 기준";
    const cells = [];
    const startY = now.getFullYear(), startM = now.getMonth();
    for (let i = 0; i < 14; i++) {
      const d = new Date(startY, startM + i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const evs = DB.seasons.map((s) => Object.assign({}, s, { d: parseDate(s.date) }))
        .filter((s) => s.d.getFullYear() === y && s.d.getMonth() + 1 === m)
        .sort((a, b) => a.d - b.d);
      const isNow = y === now.getFullYear() && m === now.getMonth() + 1;
      cells.push(
        '<div class="m' + (isNow ? " now" : "") + '"><div class="mm">' + y + "년 " + m + "월</div>" +
        "<div class='nm'>" + (evs.length ? evs.map((e) => esc(e.name)).join(" · ") : "비수기 · 키워드 테스트") + "</div>" +
        "<div class='lead'>" + (evs.length ? evs.map((e) => (e.d.getMonth() + 1) + "/" + e.d.getDate() + " 피크 · " + e.lead + "주 전 발주").join("<br>") : "신규 키워드·상세페이지 점검") + "</div>" +
        (evs.length ? '<div class="heat' + (Math.max.apply(null, evs.map((e) => e.heat)) >= 3 ? " hot" : "") + '">' + (Math.max.apply(null, evs.map((e) => e.heat)) >= 3 ? "피크" : "▲") + "</div>" : "") +
        "</div>"
      );
    }
    $("#nCal").innerHTML = cells.join("");

    const next = HS.nextEvents(3);
    $("#nNext").innerHTML = next.map((s) => {
      const order = addDays(s.d, -Math.round(s.lead * 7));
      const arrive = addDays(s.d, -7);
      const dd = dday(s.d);
      const orderPast = order < new Date();
      return '<div class="next-card"><div class="dday">D-' + dd + (orderPast ? " · 발주 마감 지남" : dd <= 14 ? " · 발주 임박" : "") + "</div>" +
        "<h4>" + esc(s.name) + "</h4>" +
        "<dl><dt>피크</dt><dd>" + fmtDate(s.d, true) + "</dd>" +
        "<dt>발주 마감</dt><dd>" + fmtDate(order) + (orderPast ? " <span class='pill-mini bad'>지남</span>" : "") + "</dd>" +
        "<dt>입고 목표</dt><dd>" + fmtDate(arrive) + "</dd>" +
        "<dt>근거</dt><dd>" + esc(s.note) + "</dd></dl></div>";
    }).join("");
  }

  const NICHE_VOCAB = {
    fresh: { grade: HS.DB.keywordVocab.grade, origin: HS.DB.keywordVocab.origin },
    car: { grade: ["2in1", "대형", "회전형", "논슬립", "단품"], origin: ["로켓배송", "무료배송", "당일출고", "선물용", "차량용"] },
    living: { grade: ["대용량", "소형", "스테인리스", "세트", "단품"], origin: ["무료배송", "당일출고", "가정용", "선물용", "세트"] },
    digital: { grade: ["무선", "저소음", "텐키리스", "풀배열", "단품"], origin: ["로켓배송", "당일출고", "사무용", "게이밍", "선물용"] },
    fashion: { grade: ["오버핏", "슬림", "기본", "세트", "단품"], origin: ["무료배송", "당일출고", "선물용", "커플", "세트"] },
    etc: { grade: ["기본", "대형", "소형", "세트", "단품"], origin: ["무료배송", "당일출고", "가정용", "선물용", "세트"] }
  };
  const vocabFor = (cat) => NICHE_VOCAB[cat] || NICHE_VOCAB.etc;
  function fillNicheVocab(cat) {
    const v = vocabFor(cat);
    const keep = (sel, arr) => {
      const prev = $(sel).value;
      $(sel).innerHTML = arr.map((x) => "<option>" + esc(x) + "</option>").join("");
      if (arr.indexOf(prev) >= 0) $(sel).value = prev;
    };
    keep("#nGrade", v.grade);
    keep("#nOrigin", v.origin);
  }

  function fillNiche() {
    $("#nProduct").innerHTML = DB.products.map((p) => '<option value="' + p.id + '">' + esc(p.name) + "</option>").join("");
    fillNicheVocab(DB.products[0].feeCat);
    $("#nB2G").innerHTML = DB.suppliers.map((s) =>
      "<tr><td><b>" + esc(s.name) + "</b></td><td class='small'>" + esc(s.cat) + "</td><td class='small'>" + esc(s.b2g) + "</td><td class='small'><a href='" + esc(s.url) + "' target='_blank' rel='noopener'>" + esc(s.url.replace(/^https?:\/\//, "")) + "</a></td></tr>"
    ).join("");
    genNiche();
  }

  function genNiche() {
    const p = HS.byId[$("#nProduct").value] || DB.products[0];
    const fresh = p.feeCat === "fresh";
    const grade = $("#nGrade").value, origin = $("#nOrigin").value;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const giftNames = ["크리스마스", "설날", "어린이날·가정의 달", "추석", "빼빼로데이", "신학기"];
    const fruitSeasons = ["설날", "추석", "크리스마스", "블랙프라이데이", "어린이날·가정의 달"];
    const all = DB.seasons.map((s) => Object.assign({}, s, { d: parseDate(s.date) })).filter((s) => s.d >= now).sort((a, b) => a.d - b.d);
    const season = fresh ? (all.filter((s) => fruitSeasons.indexOf(s.name) >= 0)[0] || null) : (all.filter((s) => giftNames.indexOf(s.name) >= 0)[0] || null);
    const list = [];
    const push = (kw, type, intent) => {
      const k = kw.replace(/\s+/g, " ").trim();
      if (!k || list.some((x) => x.kw === k)) return;
      list.push({ kw: k, type, intent });
    };
    const has = (t) => p.name.indexOf(t) >= 0;
    if (!has(grade)) { push(grade + " " + p.name, "등급·규격", grade + " 검색"); push(p.name + " " + grade, "등급·규격", "규격 비교"); }
    if (!has(origin)) { push(origin + " " + p.name, "유통·판매", origin + " 구매"); push(p.name + " " + origin, "유통·판매", "구매 조건"); }
    if (p.searchTerm) push(p.searchTerm + " " + origin, "실제 검색어", p.searchTerm + " 구매");
    push(p.name + " 추천", "비교", "구매 전 비교");
    push(p.name + " 후기", "신뢰", "구매 전 확인");
    push(p.name + " 가격", "가격", "가격 민감");
    push(p.name + " 선물 세트", "선물", "선물 수요");
    if (fresh) {
      if (!has("kg")) push(p.name + " 5kg", "규격", "중량 검색");
      push(p.name + " 가정용", "용도", "가정 소비");
      push(p.name + " 산지직송", "유통·판매", "직송 선호");
      push(p.name + " 벌크", "용량", "업소·대량");
      push(p.name + " 2/3 완숙", "품질", "제철 타이밍");
      push(p.name + " 무수거 환불", "CS", "파손 걱정 해소");
      if (p.name.indexOf("사과") >= 0) { push("엔부사과", "실측 별칭", "빈집 키워드(리뷰 680건 선점 사례)"); push("피치애플", "실측 별칭", "선점 셀러 별칭"); }
      if (p.name.indexOf("반시") >= 0 || p.name.indexOf("단감") >= 0) push("청도 반시", "실측 별칭", "산지 별칭");
    } else {
      push(p.name + " 무료배송", "구매 조건", "배송비 민감");
      push(p.name + " 당일출고", "구매 조건", "빠른 배송");
      push(p.name + " 세트", "구성", "객단가 상승");
    }
    if (season) {
      push(season.name + " " + p.name, "시즌", season.name + " 선물");
      push(p.name + " " + season.name + " 선물", "시즌", season.name + " 선물");
    }
    const rows = list.slice(0, 24);
    $("#nList").innerHTML = rows.map((r) => "<tr><td><b>" + esc(r.kw) + '</b></td><td><span class="pill-mini brand">' + esc(r.type) + "</span></td><td class='small'>" + esc(r.intent) + '</td><td class="num">' + r.kw.length + "</td></tr>").join("");
    window.__nicheCopy = rows.map((r) => r.kw).join("\n");
  }

  function initNiche() {
    renderCalendar();
    fillNiche();
    $("#nGen").addEventListener("click", genNiche);
    $("#nProduct").addEventListener("change", () => {
      const p = HS.byId[$("#nProduct").value];
      if (p) fillNicheVocab(p.feeCat);
      genNiche();
    });
    $("#nGrade").addEventListener("change", genNiche);
    $("#nOrigin").addEventListener("change", genNiche);
    $("#nCopy").addEventListener("click", () => copyText(window.__nicheCopy || "", "키워드 목록을 복사했습니다"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    try { initLeak(); } catch (e) { console.error("leak", e); }
    try { initStudio(); } catch (e) { console.error("studio", e); }
    try { initGeo(); } catch (e) { console.error("geo", e); }
    try { initNiche(); } catch (e) { console.error("niche", e); }
    const fs = $("#footSources");
    if (fs) fs.textContent = DB.meta.sourceNote + " (materials/miracle/transcript.xml은 0바이트 — 담을 실측 단가 없음)";
    const dc = $("#dbCount");
    if (dc) dc.textContent = DB.products.length;
  });
})();
