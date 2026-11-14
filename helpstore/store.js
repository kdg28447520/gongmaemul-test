/* 동곤 헬프스토어 PRO — localStorage 저장소 */
(function () {
  "use strict";
  const KEY = "hs_pro_records_v1";
  const INPUT_KEY = "hs_pro_inputs_v1";
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TYPE_LABEL = { sourcing: "소싱 판정", ad: "광고 분석", leak: "마진 진단" };
  const TYPE_CLS = { sourcing: "brand", ad: "ok", leak: "warn" };

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); } catch (e) { /* 용량 초과 */ }
    render();
  }
  function fmt(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "." + p(d.getMonth() + 1) + "." + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  function add(rec) {
    const list = read();
    const item = Object.assign({
      id: "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString()
    }, rec);
    list.unshift(item);
    write(list);
    return item;
  }
  function remove(id) { write(read().filter((r) => r.id !== id)); }
  function clear() { if (confirm("저장된 기록을 모두 지울까요? 이 기기에서만 삭제됩니다.")) write([]); }

  function summaryOf(r) {
    const d = r.data || {};
    if (r.type === "sourcing") return (d.channel === "rocket" ? "로켓그로스" : "위탁·직송") + " · 판매가 " + (d.price || 0).toLocaleString("ko-KR") + "원 · 순익 " + (d.net || 0).toLocaleString("ko-KR") + "원 · " + d.verdict;
    if (r.type === "ad") return "광고비 " + (d.cost || 0).toLocaleString("ko-KR") + "원 · 매출 " + (d.revenue || 0).toLocaleString("ko-KR") + "원 · ROAS " + d.roas + "% · 커트라인 " + d.cut + "%";
    if (r.type === "leak") return d.product + " · " + d.qty + "개 기준 · 로켓 " + d.rgMargin + "% vs 직송 " + d.wgMargin + "%";
    return "";
  }

  function render() {
    const list = read();
    const box = $("#stList");
    const empty = $("#stEmpty");
    if (!box) return;
    $("#navStoreCount").textContent = list.length;
    $("#stCount").textContent = list.length + "건";
    empty.classList.toggle("hidden", list.length > 0);
    box.innerHTML = list.map((r) => (
      '<div class="card" style="box-shadow:none;margin-bottom:10px">' +
        '<div class="card-h"><span class="badge ' + (TYPE_CLS[r.type] || "gray") + '">' + (TYPE_LABEL[r.type] || r.type) + "</span>" +
        "<h2>" + esc(r.title) + "</h2>" +
        '<span class="right small" style="font-size:11px;color:#94a3b8">' + fmt(r.createdAt) + "</span></div>" +
        '<div class="card-b"><p class="note" style="margin-bottom:8px">' + esc(summaryOf(r)) + "</p>" +
        '<div class="strip"><button class="btn sm" data-load="' + r.id + '" type="button">불러오기</button>' +
        '<button class="btn sm ghost" data-del="' + r.id + '" type="button">삭제</button></div>' +
        '<div class="hidden" id="detail-' + r.id + '"><div class="codebox" style="margin-top:10px;max-height:260px">' + esc(JSON.stringify(r.data, null, 2)) + "</div></div>" +
        "</div></div>"
    )).join("");

    box.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      remove(b.dataset.del);
      if (window.HS) window.HS.toast("삭제했습니다");
    }));
    box.querySelectorAll("[data-load]").forEach((b) => b.addEventListener("click", () => {
      const rec = read().find((x) => x.id === b.dataset.load);
      if (!rec) return;
      try { loadRecord(rec); } catch (e) { console.error(e); }
      const det = document.getElementById("detail-" + rec.id);
      if (det) det.classList.toggle("hidden");
    }));
  }

  function loadRecord(rec) {
    const HS = window.HS;
    const d = rec.data || {};
    if (rec.type === "sourcing" && HS && d.productId) {
      document.querySelector('.nav-item[data-view="sourcing-margin"]').click();
      HS.applyProduct(d.productId, true);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v === null || v === undefined ? "" : v; };
      set("sPrice", d.price); set("sSupply", d.supply); set("sAd", d.adRate); set("sRet", d.retRate);
      document.getElementById("sPrice").dispatchEvent(new Event("input", { bubbles: true }));
      HS.toast("저장한 판정을 불러왔습니다");
      return;
    }
    // 광고·마진 진단은 상세만 펼친다
    const det = document.getElementById("detail-" + rec.id);
    if (det) det.classList.remove("hidden");
    if (HS) HS.toast("상세 내용을 펼쳤습니다");
  }

  function download(name, text, type) {
    const blob = new Blob([text], { type: type || "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }
  const csvCell = (v) => '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"';

  function exportJson() {
    const payload = { app: "동곤 헬프스토어 PRO", exportedAt: new Date().toISOString(), records: read() };
    download("helpstore-records-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
  }

  function exportCsv() {
    const rows = [["구분", "제목", "저장시각", "상품", "채널", "판매가", "매입원가", "수익", "마진율", "판정"]];
    read().forEach((r) => {
      const d = r.data || {};
      rows.push([
        TYPE_LABEL[r.type] || r.type, r.title, r.createdAt,
        d.product || d.source || "", d.channel || "",
        d.price || "", d.supply || "", d.net || d.revenue || "",
        d.margin !== undefined ? d.margin : (d.roas !== undefined ? d.roas : ""),
        d.verdict || ""
      ]);
    });
    download("helpstore-records-" + new Date().toISOString().slice(0, 10) + ".csv",
      "\ufeff" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        const recs = Array.isArray(obj) ? obj : obj.records;
        if (!Array.isArray(recs)) throw new Error("records 배열이 없습니다");
        const list = read();
        recs.forEach((r) => {
          list.push(Object.assign({ id: "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, r));
        });
        write(list);
        if (window.HS) window.HS.toast(recs.length + "건을 가져왔습니다");
      } catch (e) {
        if (window.HS) window.HS.toast("가져오기 실패: " + e.message);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  window.HSStore = {
    all: read, add, remove, clear, exportJson, exportCsv, importJson, render,
    lastInputs: () => { try { return JSON.parse(localStorage.getItem(INPUT_KEY) || "null"); } catch (e) { return null; } },
    saveInputs: (obj) => { try { localStorage.setItem(INPUT_KEY, JSON.stringify(obj)); } catch (e) {} }
  };

  document.addEventListener("DOMContentLoaded", () => {
    render();
    const b = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener("click", fn); };
    b("stExportJson", exportJson);
    b("stExportCsv", exportCsv);
    b("stClear", clear);
    const imp = document.getElementById("stImportFile");
    if (imp) imp.addEventListener("change", () => { if (imp.files[0]) importJson(imp.files[0]); });
  });
})();
