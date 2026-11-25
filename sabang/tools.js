/* 늘봄 미니 사방넷 — 발주서 변환 · 송장 검증 도구
   전부 브라우저 안에서 처리하며 어떤 파일도 서버로 보내지 않습니다. */
(function () {
  'use strict';

  var C = window.SBCore;
  if (!C) return;

  var el = C.el;

  function fileToGrid(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      var isCsv = /\.csv$/i.test(file.name);
      reader.onerror = function () { reject(new Error('파일을 읽지 못했습니다')); };
      reader.onload = function () {
        try {
          var wb = isCsv
            ? window.XLSX.read(String(reader.result), { type: 'string' })
            : window.XLSX.read(new Uint8Array(reader.result), { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          if (!ws) throw new Error('시트가 비어 있습니다');
          resolve(window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }));
        } catch (err) {
          reject(err);
        }
      };
      if (isCsv) reader.readAsText(file, 'utf-8');
      else reader.readAsArrayBuffer(file);
    });
  }

  function badge(kind, text) {
    return el('span', 'sb-badge sb-badge--' + kind, text);
  }

  function statBox(label) {
    var box = el('div', 'sb-stat');
    box.appendChild(el('span', 'sb-stat-label', label));
    var value = el('span', 'sb-stat-value', '0');
    box.appendChild(value);
    return { box: box, value: value };
  }

  function setStat(node, value) {
    node.value.textContent = Number(value || 0).toLocaleString('ko-KR');
  }

  /* ───────────────────────── 주문 → 발주서 ───────────────────────── */

  function mountOrderTool(root) {
    var sender = { name: '', phone: '', address: '' };
    try {
      sender = JSON.parse(sessionStorage.getItem('sb_sender') || 'null') || sender;
    } catch (err) { /* 저장값 없음 */ }

    var senderBox = el('div', 'sb-sender');
    var fields = [
      ['name', '보내는분 이름', '늘봄상회'],
      ['phone', '연락처', '010-0000-0000'],
      ['address', '주소', '경기도 안산시 …']
    ];
    var senderInputs = {};
    fields.forEach(function (spec) {
      var wrap = el('label', 'sb-field');
      wrap.appendChild(el('span', null, spec[1]));
      var input = el('input', 'sb-input');
      input.type = 'text';
      input.placeholder = spec[2];
      input.value = sender[spec[0]] || '';
      input.addEventListener('input', function () {
        sender[spec[0]] = input.value;
        persist();
        render();
      });
      senderInputs[spec[0]] = input;
      wrap.appendChild(input);
      senderBox.appendChild(wrap);
    });

    function persist() {
      try { sessionStorage.setItem('sb_sender', JSON.stringify(sender)); } catch (err) { /* 무시 */ }
    }

    var toolbar = el('div', 'sb-toolbar');
    var fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv';
    var sampleBtn = el('button', 'sb-btn', '샘플 주문');
    sampleBtn.type = 'button';
    var fileName = el('span', 'sb-file', '');
    toolbar.appendChild(fileInput);
    toolbar.appendChild(sampleBtn);
    toolbar.appendChild(fileName);

    var drop = el('div', 'sb-drop', '주문 엑셀·CSV를 여기로 끌어다 놓으세요');

    var stats = el('div', 'sb-stats');
    var sTotal = statBox('총 행');
    var sOk = statBox('발주 가능');
    var sUnmapped = statBox('매핑 필요');
    var sMissing = statBox('값 누락');
    [sTotal, sOk, sUnmapped, sMissing].forEach(function (s) { stats.appendChild(s.box); });

    var preview = el('div', 'sb-preview');
    var actions = el('div', 'sb-actions');
    var xlsxBtn = el('button', 'sb-btn sb-btn--primary', '.xlsx 다운로드');
    xlsxBtn.type = 'button';
    var csvBtn = el('button', 'sb-btn', 'CSV 미리보기');
    csvBtn.type = 'button';
    actions.appendChild(xlsxBtn);
    actions.appendChild(csvBtn);

    var details = el('details', 'sb-details');
    details.appendChild(el('summary', null, '매핑 필요·누락 보기'));
    var detailBody = el('div');
    details.appendChild(detailBody);

    var note = el('p', 'sb-note', '파일은 브라우저 안에서만 처리되며 전송되지 않습니다.');

    root.textContent = '';
    [senderBox, toolbar, drop, stats, preview, actions, details, note].forEach(function (node) {
      root.appendChild(node);
    });

    var state = { records: [], result: { rows: [], unmapped: [], missing: [] } };

    function render() {
      var result = C.buildJewelry(state.records, sender);
      state.result = result;
      setStat(sTotal, state.records.length);
      setStat(sOk, result.rows.length);
      setStat(sUnmapped, result.unmapped.length);
      setStat(sMissing, result.missing.length);

      preview.textContent = '';
      if (!result.rows.length) {
        preview.appendChild(el('p', 'sb-empty', '발주서로 만들 수 있는 주문이 아직 없습니다.'));
      } else {
        var wrap = el('div', 'sb-tablewrap');
        var table = el('table', 'sb-table');
        var thead = el('thead');
        var hr = el('tr');
        C.JEWELRY_COLUMNS.forEach(function (label) {
          hr.appendChild(el('th', null, label));
        });
        thead.appendChild(hr);
        table.appendChild(thead);

        var tbody = el('tbody');
        result.rows.slice(0, 50).forEach(function (row) {
          var tr = el('tr');
          row.forEach(function (value, idx) {
            var cls = idx === 5 || idx === 6 ? 'sb-mono' : null;
            tr.appendChild(el('td', cls, value === '' ? '—' : value));
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        wrap.appendChild(table);
        preview.appendChild(wrap);
        if (result.rows.length > 50) {
          preview.appendChild(el('p', 'sb-more', '외 ' + (result.rows.length - 50).toLocaleString('ko-KR') + '행 (다운로드에 모두 포함됩니다)'));
        }
      }

      xlsxBtn.disabled = !result.rows.length;
      csvBtn.disabled = !result.rows.length;

      detailBody.textContent = '';
      if (result.unmapped.length) {
        detailBody.appendChild(el('p', 'sb-hint', '매핑 필요 ' + result.unmapped.length + '건 — config/mini_sabangnet.json의 product_map에 정규식을 추가하세요.'));
        var ul1 = el('ul', 'sb-list');
        result.unmapped.slice(0, 10).forEach(function (rec) {
          ul1.appendChild(el('li', null, (rec.order_id || '주문번호 없음') + ' · ' + (rec.product_name || '상품명 없음') + (rec.option ? ' / ' + rec.option : '')));
        });
        detailBody.appendChild(ul1);
      }
      if (result.missing.length) {
        detailBody.appendChild(el('p', 'sb-hint', '받는분 정보 누락 ' + result.missing.length + '건'));
        var ul2 = el('ul', 'sb-list');
        result.missing.slice(0, 10).forEach(function (rec) {
          var lacks = [];
          if (!rec.receiver_name) lacks.push('이름');
          if (!rec.phone) lacks.push('연락처');
          if (!rec.address) lacks.push('주소');
          ul2.appendChild(el('li', null, (rec.order_id || '주문번호 없음') + ' · ' + lacks.join('·') + ' 없음'));
        });
        detailBody.appendChild(ul2);
      }
      if (!result.unmapped.length && !result.missing.length) {
        detailBody.appendChild(el('p', 'sb-empty', '제외된 주문이 없습니다.'));
      }
    }

    async function handleFile(file) {
      if (!file) return;
      fileName.textContent = file.name;
      try {
        var grid = await fileToGrid(file);
        var parsed = C.readOrders(grid);
        state.records = parsed.records;
        render();
      } catch (err) {
        fileName.textContent = '파일을 읽지 못했습니다 (' + (err && err.message ? err.message : '형식 확인') + ')';
      }
    }

    function loadSample() {
      fileName.textContent = '샘플 주문 3행';
      state.records = [
        { row: 2, order_id: 'SAMPLE-001', product_name: '26년산 엔비사과 5kg 가정용 랜덤과', option: '', quantity: 1, receiver_name: '홍길동', phone: '010-0000-0000', address: '서울시 중구 세종대로 1', memo: '문 앞', channel: '쿠팡', paid_at: '2026-11-25 09:12' },
        { row: 3, order_id: 'SAMPLE-002', product_name: '26년산 엔비사과 10kg 가정용', option: '10kg', quantity: 1, receiver_name: '홍길순', phone: '010-0000-0001', address: '부산시 해운대구 센텀중앙로 1', memo: '', channel: '스마트스토어', paid_at: '2026-11-25 10:03' },
        { row: 4, order_id: 'SAMPLE-003', product_name: '26년산 엔비사과 5kg 가정용', option: '', quantity: 2, receiver_name: '김샘플', phone: '010-0000-0002', address: '', memo: '', channel: '토스쇼핑', paid_at: '2026-11-25' }
      ];
      render();
    }

    fileInput.addEventListener('change', function () {
      handleFile(fileInput.files && fileInput.files[0]);
    });
    sampleBtn.addEventListener('click', loadSample);

    ['dragenter', 'dragover'].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        drop.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        drop.classList.remove('is-over');
      });
    });
    drop.addEventListener('drop', function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleFile(file);
    });

    xlsxBtn.addEventListener('click', function () {
      if (!state.result.rows.length) return;
      C.downloadXlsx('sabang_jewelry_' + C.stamp() + '.xlsx', 'Sheet1', C.JEWELRY_COLUMNS, state.result.rows);
    });

    csvBtn.addEventListener('click', function () {
      if (!state.result.rows.length) return;
      C.downloadCsv('sabang_jewelry_' + C.stamp() + '.csv', C.JEWELRY_COLUMNS, state.result.rows);
    });

    render();

    document.addEventListener('sabang:data', function () {
      if (state.records.length) render();
    });
  }

  /* ───────────────────────── 송장 검증 ───────────────────────── */

  function mountInvoiceTool(root) {
    var toolbar = el('div', 'sb-toolbar');
    var fileInput = el('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls';
    var sampleBtn = el('button', 'sb-btn', '샘플');
    sampleBtn.type = 'button';
    var fileName = el('span', 'sb-file', '');
    toolbar.appendChild(fileInput);
    toolbar.appendChild(sampleBtn);
    toolbar.appendChild(fileName);

    var row2 = el('div', 'sb-row2');
    var label = el('label', 'sb-hint', '채널 일괄 지정');
    var select = el('select', 'sb-select');
    [['all', '전체'], ['coupang', '쿠팡'], ['naver', '스마트스토어'], ['toss', '토스쇼핑']].forEach(function (pair) {
      var option = el('option', null, pair[1]);
      option.value = pair[0];
      select.appendChild(option);
    });
    select.value = 'coupang';
    row2.appendChild(label);
    row2.appendChild(select);
    row2.appendChild(el('span', 'sb-hint', '엑셀에 거래처 열이 있으면 그 값이 우선입니다'));

    var drop = el('div', 'sb-drop', '배송처리된엑셀(.xlsx)을 여기로');

    var stats = el('div', 'sb-stats');
    var sAll = statBox('전체 행');
    var sOk = statBox('정상');
    var sWarn = statBox('확인 필요');
    var sErr = statBox('오류');
    [sAll, sOk, sWarn, sErr].forEach(function (s) { stats.appendChild(s.box); });

    var tableWrap = el('div', 'sb-tablewrap');
    var actions = el('div', 'sb-actions');
    var csvBtn = el('button', 'sb-btn', '검증 결과 CSV');
    csvBtn.type = 'button';
    csvBtn.disabled = true;
    actions.appendChild(csvBtn);
    var note = el('p', 'sb-note', '파일은 브라우저 안에서만 처리되며 전송되지 않습니다.');

    root.textContent = '';
    [toolbar, row2, drop, stats, tableWrap, actions, note].forEach(function (node) {
      root.appendChild(node);
    });

    var state = { rows: [] };

    function resolveChannel(raw) {
      var fromCell = C.channelKey(raw);
      if (fromCell) return fromCell;
      return select.value === 'all' ? 'coupang' : select.value;
    }

    function build() {
      var records = state.rows;
      var seen = {};
      var out = [];
      records.forEach(function (rec, idx) {
        var channel = resolveChannel(rec.channel_label || '');
        var carrier = C.carrierName(rec.carrier_raw);
        var code = carrier ? C.carrierCode(channel, rec.carrier_raw) : null;
        var invoice = C.checkInvoice(rec.invoice);
        var key = C.digits(rec.order_no);
        var kind = 'ok';
        var label = invoice.label;

        if (!rec.order_no) {
          kind = 'err';
          label = '주문번호 없음';
        } else if (seen[key]) {
          kind = 'warn';
          label = '중복';
        } else if (!carrier) {
          kind = 'err';
          label = '코드 없음';
        } else if (channel === 'daangn') {
          kind = 'ok';
          label = '수동';
        } else if (invoice.status !== 'ok') {
          kind = invoice.status;
        }
        if (key) seen[key] = true;

        out.push({
          index: idx + 1,
          order_no: rec.order_no,
          carrier_raw: rec.carrier_raw || '—',
          channel: channel,
          channel_label: C.CHANNEL_LABEL[channel] || channel,
          code: channel === 'daangn' ? '수동' : (code || '—'),
          invoice: invoice.value || '—',
          kind: kind,
          label: label
        });
      });
      return out;
    }

    function render() {
      var rows = build();
      setStat(sAll, rows.length);
      setStat(sOk, rows.filter(function (r) { return r.kind === 'ok'; }).length);
      setStat(sWarn, rows.filter(function (r) { return r.kind === 'warn'; }).length);
      setStat(sErr, rows.filter(function (r) { return r.kind === 'err'; }).length);

      tableWrap.textContent = '';
      if (!rows.length) {
        tableWrap.appendChild(el('p', 'sb-empty', '검증할 행이 없습니다. 배송처리된엑셀을 넣어 주세요.'));
        csvBtn.disabled = true;
        return;
      }

      var table = el('table', 'sb-table');
      var thead = el('thead');
      var hr = el('tr');
      ['#', '주문번호', '택배사(원본)', '채널', '등록 코드', '운송장', '검증'].forEach(function (labelText) {
        hr.appendChild(el('th', null, labelText));
      });
      thead.appendChild(hr);
      table.appendChild(thead);

      var tbody = el('tbody');
      rows.slice(0, 200).forEach(function (row) {
        var tr = el('tr');
        tr.appendChild(el('td', null, row.index));
        tr.appendChild(el('td', 'sb-mono', row.order_no));
        tr.appendChild(el('td', null, row.carrier_raw));
        tr.appendChild(el('td', null, row.channel_label));
        tr.appendChild(el('td', 'sb-mono', row.code));
        tr.appendChild(el('td', 'sb-mono', row.invoice));
        var td = el('td');
        td.appendChild(badge(row.kind, row.label));
        tr.appendChild(td);
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      tableWrap.appendChild(table);

      csvBtn.disabled = false;
    }

    function handleFile(file) {
      if (!file) return;
      fileName.textContent = file.name;
      fileToGrid(file).then(function (grid) {
        var parsed = C.parseShipment(grid).map(function (rec) {
          return rec;
        });
        state.rows = parsed.map(function (rec) {
          return {
            order_no: rec.order_no,
            carrier_raw: rec.carrier_raw,
            invoice: rec.invoice,
            channel_label: rec.channel ? C.CHANNEL_LABEL[rec.channel] : ''
          };
        });
        render();
      }).catch(function (err) {
        fileName.textContent = '파일을 읽지 못했습니다 (' + (err && err.message ? err.message : '형식 확인') + ')';
      });
    }

    function loadSample() {
      fileName.textContent = '샘플 3행';
      state.rows = [
        { order_no: 'SAMPLE-001', carrier_raw: 'CJ대한통운', invoice: '601664111971', channel_label: '쿠팡' },
        { order_no: 'SAMPLE-002', carrier_raw: '우체국택배', invoice: '123456789012', channel_label: '스마트스토어' },
        { order_no: 'SAMPLE-003', carrier_raw: '', invoice: '12345', channel_label: '토스쇼핑' }
      ];
      render();
    }

    fileInput.addEventListener('change', function () {
      handleFile(fileInput.files && fileInput.files[0]);
    });
    sampleBtn.addEventListener('click', loadSample);
    select.addEventListener('change', render);

    ['dragenter', 'dragover'].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        drop.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      drop.addEventListener(type, function (event) {
        event.preventDefault();
        drop.classList.remove('is-over');
      });
    });
    drop.addEventListener('drop', function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleFile(file);
    });

    document.addEventListener('sabang:data', function () {
      if (state.rows.length) render();
    });

    csvBtn.addEventListener('click', function () {
      var rows = build().map(function (row) {
        return [row.order_no, row.carrier_raw, row.channel_label, row.code, row.invoice, row.label];
      });
      C.downloadCsv('sabang_invoice_check_' + C.stamp() + '.csv',
        ['주문번호', '택배사', '채널', '등록코드', '운송장', '검증'], rows);
    });

    render();
  }

  function mount() {
    var orderRoot = document.getElementById('order-tool');
    if (orderRoot) mountOrderTool(orderRoot);
    var invoiceRoot = document.getElementById('invoice-tool');
    if (invoiceRoot) mountInvoiceTool(invoiceRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
