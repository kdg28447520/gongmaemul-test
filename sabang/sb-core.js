/* SBCore — 늘봄 미니 사방넷 공통 로직
   주문 엑셀 파싱, 쥬얼리프룻 13열 발주서 생성, 택배사 코드·운송장 검증.
   브라우저 안에서만 동작하며 어떤 값도 외부로 보내지 않습니다. */
window.SBCore = (function () {
  'use strict';

  var HEADER_ALIAS = {
    order_id: ['주문번호', 'orderid', '주문아이디', '상품주문번호', '주문번호(orderid)'],
    product: ['상품명', 'productname', '상품', '아이템명', '등록상품명', '상품명(productname)', '상품이름'],
    option: ['옵션', '옵션정보', '옵션명', 'option'],
    qty: ['수량', '구매수량', 'quantity', '주문수량'],
    receiver: ['받는분', '수령인', '받는분성명', '수취인', '이름'],
    phone: ['연락처', '받는분전화번호', '수령인연락처', '휴대폰', '전화번호', '수취인연락처'],
    address: ['주소', '받는분주소', '배송지', '배송주소', '수취인주소'],
    memo: ['배송메시지', '배송메모', '요청사항', '메모'],
    channel: ['거래처명', '채널', '마켓', '판매처'],
    paid_at: ['일자', '결제일', '주문일', '주문일자', '결제일시']
  };

  var JEWELRY_COLUMNS = [
    '일자', '거래처명', '받는분성명', '받는분전화번호', '받는분기타연락처', '받는분주소',
    '품목명', '수량', '보내는분성명', '보내는분전화번호', '보내는분주소', '배송메시지', '주문번호'
  ];

  var CARRIERS = [
    { name: 'CJ대한통운', codes: { coupang: 'CJGLS', naver: 'CJGLS', toss: 'CJ대한통운' }, alias: ['cj', '대한통운', 'cjgls', 'cj대한통운택배'] },
    { name: '우체국택배', codes: { coupang: 'EPOST', naver: 'EPOST', toss: '우체국택배' }, alias: ['우체국', 'epost', '우체국등기'] },
    { name: '한진택배', codes: { coupang: 'HANJIN', naver: 'HANJIN', toss: '한진택배' }, alias: ['한진', 'hanjin'] },
    { name: '롯데택배', codes: { coupang: 'HYUNDAI', naver: 'HYUNDAI', toss: '롯데택배' }, alias: ['롯데', '현대', 'hyundai', '롯데글로벌로지스'] },
    { name: '로젠택배', codes: { coupang: 'KGB', naver: 'KGB', toss: '로젠택배' }, alias: ['로젠', 'kgb'] },
    { name: '경동택배', codes: { coupang: 'KDEXP', naver: 'KDEXP', toss: '경동택배' }, alias: ['경동', 'kdexp'] },
    { name: '대신택배', codes: { coupang: 'DAESIN', naver: 'DAESIN', toss: '대신택배' }, alias: ['대신', 'daesin'] },
    { name: '일양로지스', codes: { coupang: 'ILYANG', naver: 'ILYANG', toss: '일양로지스' }, alias: ['일양', 'ilyang'] },
    { name: '건영택배', codes: { coupang: 'KUNYOUNG', naver: 'KUNYOUNG', toss: '건영택배' }, alias: ['건영', 'kunyoung'] }
  ];

  var CHANNEL_LABEL = { coupang: '쿠팡', naver: '스마트스토어', toss: '토스쇼핑', daangn: '당근' };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function digits(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[^0-9]/g, '');
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function todayKst() {
    var now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return now.getUTCFullYear() + '-' + pad2(now.getUTCMonth() + 1) + '-' + pad2(now.getUTCDate());
  }

  function ymd(value) {
    var text = String(value === null || value === undefined ? '' : value).trim();
    if (!text) return todayKst();
    var m = text.match(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/);
    if (m) {
      var month = parseInt(m[2], 10);
      var day = parseInt(m[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return m[1] + '-' + pad2(month) + '-' + pad2(day);
      }
    }
    var compact = text.replace(/[^0-9]/g, '');
    if (compact.length === 8) {
      return compact.slice(0, 4) + '-' + compact.slice(4, 6) + '-' + compact.slice(6, 8);
    }
    return todayKst();
  }

  function normKey(value) {
    return String(value === null || value === undefined ? '' : value)
      .toLowerCase()
      .replace(/[\s_\-()[\]{}]/g, '');
  }

  function findHeaderRow(grid, maxScan) {
    var limit = Math.min(grid.length, maxScan || 10);
    var best = 0;
    var bestHits = 0;
    for (var r = 0; r < limit; r += 1) {
      var labels = (grid[r] || []).map(normKey);
      var hits = 0;
      Object.keys(HEADER_ALIAS).forEach(function (key) {
        var aliases = HEADER_ALIAS[key].map(normKey);
        if (labels.some(function (label) { return aliases.indexOf(label) >= 0; })) hits += 1;
      });
      if (hits > bestHits) {
        bestHits = hits;
        best = r;
      }
    }
    return bestHits >= 2 ? best : 0;
  }

  function colIndex(labels, key, fallback) {
    var aliases = (HEADER_ALIAS[key] || []).map(normKey);
    for (var i = 0; i < labels.length; i += 1) {
      if (aliases.indexOf(normKey(labels[i])) >= 0) return i;
    }
    return typeof fallback === 'number' ? fallback : -1;
  }

  function cell(row, index) {
    if (index < 0 || !row || index >= row.length) return '';
    var value = row[index];
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' && isFinite(value) && Math.floor(value) === value) return String(value);
    return String(value).trim();
  }

  function readOrders(grid) {
    var headerRow = findHeaderRow(grid, 10);
    var labels = grid[headerRow] || [];
    var idx = {
      order_id: colIndex(labels, 'order_id'),
      product: colIndex(labels, 'product'),
      option: colIndex(labels, 'option', -1),
      qty: colIndex(labels, 'qty', -1),
      receiver: colIndex(labels, 'receiver'),
      phone: colIndex(labels, 'phone'),
      address: colIndex(labels, 'address'),
      memo: colIndex(labels, 'memo', -1),
      channel: colIndex(labels, 'channel', -1),
      paid_at: colIndex(labels, 'paid_at', -1)
    };

    var records = [];
    for (var r = headerRow + 1; r < grid.length; r += 1) {
      var row = grid[r] || [];
      var empty = row.every(function (v) { return String(v === null || v === undefined ? '' : v).trim() === ''; });
      if (empty) continue;
      var orderId = cell(row, idx.order_id);
      if (normKey(orderId) === '주문번호') continue;
      var qtyText = digits(cell(row, idx.qty));
      records.push({
        row: r + 1,
        order_id: orderId,
        product_name: cell(row, idx.product),
        option: cell(row, idx.option),
        quantity: qtyText ? parseInt(qtyText, 10) : 1,
        receiver_name: cell(row, idx.receiver),
        phone: cell(row, idx.phone),
        address: cell(row, idx.address),
        memo: cell(row, idx.memo),
        channel: cell(row, idx.channel),
        paid_at: cell(row, idx.paid_at)
      });
    }
    return { records: records, headerRow: headerRow + 1 };
  }

  function mapProduct(name, option) {
    var data = window.SABANG_DATA || {};
    var rules = data.product_map || [];
    var text = String(name || '') + ' ' + String(option || '');
    for (var i = 0; i < rules.length; i += 1) {
      var pattern = rules[i].match;
      if (!pattern) continue;
      try {
        if (new RegExp(pattern, 'i').test(text)) return rules[i].item || null;
      } catch (err) { /* 잘못된 정규식은 건너뜀 */ }
    }
    return null;
  }

  function buildJewelry(records, sender) {
    var who = sender || {};
    var rows = [];
    var unmapped = [];
    var missing = [];

    (records || []).forEach(function (rec) {
      var item = mapProduct(rec.product_name, rec.option);
      if (!item) {
        unmapped.push(rec);
        return;
      }
      if (!rec.receiver_name || !rec.phone || !rec.address) {
        missing.push(rec);
        return;
      }
      rows.push([
        ymd(rec.paid_at),
        rec.channel || '',
        rec.receiver_name,
        rec.phone,
        '',
        rec.address,
        item,
        String(rec.quantity || 1),
        who.name || '',
        who.phone || '',
        who.address || '',
        rec.memo || '',
        rec.order_id || ''
      ]);
    });
    return { rows: rows, unmapped: unmapped, missing: missing };
  }

  function carrierName(raw) {
    var key = normKey(raw);
    if (!key) return null;
    for (var i = 0; i < CARRIERS.length; i += 1) {
      var item = CARRIERS[i];
      if (normKey(item.name) === key) return item.name;
      if (item.alias.indexOf(key) >= 0) return item.name;
    }
    return null;
  }

  function carrierCode(channel, raw) {
    var name = carrierName(raw);
    if (!name) return null;
    if (channel === 'daangn') return name;
    for (var i = 0; i < CARRIERS.length; i += 1) {
      if (CARRIERS[i].name === name) return CARRIERS[i].codes[channel] || null;
    }
    return null;
  }

  function channelKey(text) {
    var value = String(text || '');
    if (value.indexOf('쿠팡') >= 0) return 'coupang';
    if (value.indexOf('네이버') >= 0 || value.indexOf('스마트') >= 0) return 'naver';
    if (value.indexOf('토스') >= 0) return 'toss';
    if (value.indexOf('당근') >= 0) return 'daangn';
    return null;
  }

  function checkInvoice(raw) {
    var value = digits(raw);
    var status = 'err';
    if (value.length === 12) status = 'ok';
    else if (value.length >= 10 && value.length <= 13) status = 'warn';
    return { value: value, status: status, label: status === 'ok' ? '정상' : (status === 'warn' ? '길이 확인' : '오류') };
  }

  function parseShipment(grid) {
    var headerRow = 0;
    var limit = Math.min(grid.length, 10);
    for (var r = 0; r < limit; r += 1) {
      var labels = (grid[r] || []).map(normKey);
      if (labels.indexOf('주문번호') >= 0 || labels.indexOf('받는분성명') >= 0) {
        headerRow = r;
        break;
      }
    }

    var labels = grid[headerRow] || [];
    var orderIdx = -1;
    var carrierIdx = -1;
    var invoiceIdx = -1;
    var channelIdx = -1;

    for (var i = 0; i < labels.length; i += 1) {
      var label = normKey(labels[i]);
      if (orderIdx < 0 && label === '주문번호') orderIdx = i;
      if (carrierIdx < 0 && label.indexOf('택배') >= 0) carrierIdx = i;
      if (invoiceIdx < 0 && (label.indexOf('운송') >= 0 || label.indexOf('송장') >= 0)) invoiceIdx = i;
      if (channelIdx < 0 && (label.indexOf('거래처') >= 0 || label.indexOf('채널') >= 0)) channelIdx = i;
    }

    if (orderIdx < 0) orderIdx = Math.min(12, Math.max(0, labels.length - 3));
    if (carrierIdx < 0 || carrierIdx === orderIdx) carrierIdx = orderIdx + 1;
    if (invoiceIdx < 0 || invoiceIdx === orderIdx || invoiceIdx === carrierIdx) invoiceIdx = carrierIdx + 1;

    var out = [];
    for (var r2 = headerRow + 1; r2 < grid.length; r2 += 1) {
      var row = grid[r2] || [];
      var orderNo = cell(row, orderIdx);
      if (!orderNo || normKey(orderNo) === '주문번호') continue;
      out.push({
        row: r2 + 1,
        order_no: orderNo,
        carrier_raw: cell(row, carrierIdx),
        invoice: cell(row, invoiceIdx),
        channel: channelKey(cell(row, channelIdx))
      });
    }
    return out;
  }

  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function escapeCsv(value) {
    var text = String(value === null || value === undefined ? '' : value);
    if (/[",\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function downloadCsv(filename, header, rows) {
    var lines = [header.map(escapeCsv).join(',')];
    (rows || []).forEach(function (row) {
      lines.push(row.map(escapeCsv).join(','));
    });
    downloadBlob(filename, new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }));
  }

  function downloadXlsx(filename, sheetName, header, rows) {
    if (!window.XLSX) return false;
    var data = [header].concat(rows || []);
    var ws = window.XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = header.map(function (label) {
      if (label === '받는분주소' || label === '보내는분주소') return { wch: 42 };
      if (label === '품목명') return { wch: 38 };
      if (label === '배송메시지') return { wch: 24 };
      return { wch: 14 };
    });
    var wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
    window.XLSX.writeFile(wb, filename);
    return true;
  }

  function stamp() {
    return todayKst().replace(/-/g, '');
  }

  return {
    el: el,
    digits: digits,
    ymd: ymd,
    todayKst: todayKst,
    stamp: stamp,
    normKey: normKey,
    HEADER_ALIAS: HEADER_ALIAS,
    JEWELRY_COLUMNS: JEWELRY_COLUMNS,
    CARRIERS: CARRIERS,
    CHANNEL_LABEL: CHANNEL_LABEL,
    findHeaderRow: findHeaderRow,
    colIndex: colIndex,
    readOrders: readOrders,
    mapProduct: mapProduct,
    buildJewelry: buildJewelry,
    carrierName: carrierName,
    carrierCode: carrierCode,
    channelKey: channelKey,
    checkInvoice: checkInvoice,
    parseShipment: parseShipment,
    downloadCsv: downloadCsv,
    downloadXlsx: downloadXlsx
  };
})();
