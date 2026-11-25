(function () {
  'use strict';

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function num(v) {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('ko-KR') : '—';
  }

  function money(v) {
    if (v === null || v === undefined || v === '') return '—';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('ko-KR') + '원' : '—';
  }

  async function main() {
    let data;
    try {
      const res = await fetch('data.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
    } catch (err) {
      const grid = document.querySelector('.channel-grid');
      if (grid) {
        grid.textContent = '';
        grid.appendChild(el('p', 'empty', '데이터를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'));
      }
      return;
    }

    window.SABANG_DATA = data;

    const syncTime = document.getElementById('syncTime');
    if (syncTime) syncTime.textContent = '동기화 ' + (data.generated_at || '—');

    renderKpi(data);
    renderChannels(data);
    renderProgress(data);
    renderLimits(data);
  }

  function renderKpi(data) {
    const channels = data.channels || [];
    const progress = data.progress || null;
    const collection = data.collection || {};
    const okCount = channels.filter(function (ch) { return ch.ok; }).length;

    const values = [
      okCount + '/' + channels.length,
      num(collection.pending_orders),
      progress ? num(progress.shipping) : '—',
      progress ? num(progress.delivered) : '—'
    ];

    const kpis = document.querySelectorAll('#kpi .kpi');
    Array.prototype.forEach.call(kpis, function (kpi, i) {
      const value = kpi.querySelector('.kpi-value');
      if (value) value.textContent = values[i] !== undefined ? values[i] : '—';
      if (i === 2) kpi.classList.add('kpi--accent');
    });
  }

  function renderChannels(data) {
    const grid = document.querySelector('.channel-grid');
    if (!grid) return;
    grid.textContent = '';

    const stats = [
      ['paid', '결제완료'],
      ['preparing', '준비중'],
      ['shipping', '배송중'],
      ['delivered', '배송완료']
    ];

    (data.channels || []).forEach(function (ch) {
      const card = el('article', 'ch-card');

      const head = el('div', 'ch-head');
      const title = el('div');
      title.appendChild(el('span', 'ch-name', ch.name || ch.key || '—'));
      title.appendChild(el('span', 'ch-mode', ch.mode === 'api' ? 'OPEN API' : '수동'));
      head.appendChild(title);
      head.appendChild(el(
        'span',
        ch.ok ? 'ch-status ch-status--ok' : 'ch-status ch-status--warn',
        ch.ok ? '연동됨' : '확인 필요'
      ));
      card.appendChild(head);

      let meta = ch.note || (ch.checked_at ? '최근 확인 ' + ch.checked_at : '—');
      if (ch.error) meta += ' · ' + ch.error;
      card.appendChild(el('div', 'ch-meta', meta));

      const statsBox = el('div', 'ch-stats');
      const counts = ch.counts || {};
      stats.forEach(function (pair) {
        const stat = el('div', 'ch-stat');
        stat.appendChild(el('span', 'ch-stat-label', pair[1]));
        stat.appendChild(el('span', 'ch-stat-value', num(counts[pair[0]])));
        statsBox.appendChild(stat);
      });
      card.appendChild(statsBox);

      card.appendChild(el('div', 'ch-scope', ch.scope || '—'));
      grid.appendChild(card);
    });
  }

  function renderProgress(data) {
    const box = document.getElementById('progressBox');
    if (!box) return;
    box.textContent = '';

    const progress = data.progress || null;
    if (!progress) {
      box.appendChild(el('p', 'empty', '최근 발주 진행 정보가 아직 없습니다.'));
      return;
    }

    const total = Number(progress.total) || 0;
    const shipping = Number(progress.shipping) || 0;
    const delivered = Number(progress.delivered) || 0;
    const pct = function (v) {
      if (!total) return 0;
      return Math.max(0, Math.min(100, (v / total) * 100));
    };

    const head = el('div', 'pg-head');
    head.appendChild(el(
      'strong',
      'pg-label',
      (progress.label || '—') + ' · 총 ' + num(progress.total) + '건'
    ));
    box.appendChild(head);

    const bar = el('div', 'pg-bar');
    const shipFill = el('span', 'pg-bar-fill');
    shipFill.style.width = pct(shipping) + '%';
    const doneFill = el('span', 'pg-bar-fill pg-bar-fill--done');
    doneFill.style.width = pct(delivered) + '%';
    bar.appendChild(shipFill);
    bar.appendChild(doneFill);
    box.appendChild(bar);

    const legend = el('div', 'pg-legend');
    legend.appendChild(el('span', null, '배송중 ' + num(shipping)));
    legend.appendChild(el('span', null, '배송완료 ' + num(delivered)));
    box.appendChild(legend);

    box.appendChild(el(
      'div',
      'pg-src',
      (progress.source || '—') + ' · ' + (progress.checked_at || '—')
    ));
  }

  function renderLimits(data) {
    const list = document.getElementById('limitList');
    if (!list) return;
    list.textContent = '';

    (data.limits || []).forEach(function (text) {
      list.appendChild(el('li', null, text));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

  /* ── 품목 매핑 ─────────────────────────────────────── */

  function renderMapping(data) {
    const wrap = document.getElementById('mapTableWrap');
    if (!wrap) return;
    wrap.textContent = '';

    const rows = (data && data.product_map) || [];
    if (!rows.length) {
      wrap.appendChild(el('p', 'empty', '아직 품목 매핑이 없습니다.'));
      return;
    }

    const table = el('table', 'data-table');
    const thead = el('thead');
    const hrow = el('tr');
    ['마켓 상품명 정규식', '쥬얼리프룻 품목명', '공급가', '상태'].forEach(function (label) {
      const th = el('th', null, label);
      th.setAttribute('scope', 'col');
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = el('tbody');
    rows.forEach(function (row) {
      const tr = el('tr');
      tr.appendChild(el('td', 'cell-mono', row.match || '—'));
      tr.appendChild(el('td', null, row.item || '—'));
      tr.appendChild(el('td', null, money(row.supply_price)));
      const td = el('td');
      td.appendChild(el('span', 'badge badge-ok', row.status === 'mapped' ? '매핑 완료' : '확인 필요'));
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const box = el('div', 'tablewrap');
    box.appendChild(table);
    wrap.appendChild(box);
  }

  function renderMapTodo(data) {
    const wrap = document.getElementById('mapTodoWrap');
    if (!wrap) return;
    wrap.textContent = '';

    const items = (data && data.map_todo) || [];
    if (!items.length) {
      wrap.appendChild(el('p', 'empty', '매핑이 필요한 품목이 없습니다.'));
      return;
    }

    items.forEach(function (item) {
      const card = el('div', 'map-todo');
      const head = el('div', 'map-todo-head');
      head.appendChild(el('strong', null, item.spec || '규격 미지정'));
      head.appendChild(el('span', 'badge badge-warn', '매핑 필요'));
      card.appendChild(head);
      if (item.note) card.appendChild(el('p', 'map-todo-note', item.note));
      wrap.appendChild(card);
    });
  }

  /* ── 탭 ────────────────────────────────────────────── */

  var TABS = ['status', 'map', 'order', 'invoice'];

  function activateTab(tab) {
    if (!tab) return;
    var key = tab.getAttribute('data-tab');
    var buttons = document.querySelectorAll('.tabs .tab');
    Array.prototype.forEach.call(buttons, function (btn) {
      var on = btn === tab;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.setAttribute('tabindex', on ? '0' : '-1');
    });
    TABS.forEach(function (name) {
      var panel = document.getElementById('panel-' + name);
      if (panel) panel.hidden = name !== key;
    });
    if (history.replaceState) history.replaceState(null, '', '#' + key);
  }

  function setupTabs() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('.tabs .tab'));
    if (!buttons.length) return;

    buttons.forEach(function (btn, idx) {
      btn.addEventListener('click', function () { activateTab(btn); });
      btn.addEventListener('keydown', function (event) {
        var next = null;
        if (event.key === 'ArrowRight') next = buttons[(idx + 1) % buttons.length];
        else if (event.key === 'ArrowLeft') next = buttons[(idx - 1 + buttons.length) % buttons.length];
        else if (event.key === 'Home') next = buttons[0];
        else if (event.key === 'End') next = buttons[buttons.length - 1];
        if (!next) return;
        event.preventDefault();
        activateTab(next);
        next.focus();
      });
    });

    var hash = (location.hash || '').replace('#', '');
    var initial = buttons.filter(function (b) { return b.getAttribute('data-tab') === hash; })[0] || buttons[0];
    activateTab(initial);

    var refresh = document.getElementById('refreshBtn');
    if (refresh) refresh.addEventListener('click', function () { location.reload(); });
  }

  /* ── 시작 ──────────────────────────────────────────── */

  async function boot() {
    await main();
    renderMapping(window.SABANG_DATA || {});
    renderMapTodo(window.SABANG_DATA || {});
    setupTabs();
    try {
      document.dispatchEvent(new CustomEvent('sabang:data', { detail: window.SABANG_DATA || null }));
    } catch (err) { /* 구형 브라우저 무시 */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
