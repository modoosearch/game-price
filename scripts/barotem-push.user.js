// ==UserScript==
// @name         바로템 시세 푸시 (변동만 중계 서버로)
// @description  바로템 거래완료 페이지를 열어두면, DOM에서 시세를 읽어 중계 서버로 변동분만 푸시합니다.
// @match        https://www.barotem.com/product/lists/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  // 중계 서버 주소 (끝에 슬래시 없이)
  const API_BASE = 'https://game-price.onrender.com';
  const PUSH_INTERVAL_MS = 30000; // 30초마다 확인 후 변동 시에만 푸시
  const TODAY_STR = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  function getServerFromPage() {
    var serverCode = null;
    var serverName = '';
    var li = document.querySelector('li[data-title="opt1"].on') || document.querySelector('li[data-opt1].on');
    if (li) {
      var opt = li.getAttribute('data-opt1');
      if (opt) serverCode = parseInt(opt, 10);
      var p = li.querySelector('p');
      if (p && p.textContent) serverName = p.textContent.trim();
    }
    var m = (location.search || '').match(/[?&]opt1=(\d+)/);
    if (m) serverCode = parseInt(m[1], 10);
    return { serverCode: serverCode, serverName: serverName };
  }

  function extractItems() {
    var todayStr = TODAY_STR();
    var items = [];
    var uls = document.querySelectorAll('ul.di_no_i');
    for (var i = 0; i < uls.length; i++) {
      var ul = uls[i];
      var block = ul.closest('li') || ul.closest('.item') || ul.closest('[class*="list"]') || ul.parentElement;
      if (!block) continue;
      var dateDiv = null;
      var divs = block.querySelectorAll('div');
      for (var j = 0; j < divs.length; j++) {
        if (/\d{1,2}월\s*\d{1,2}일/.test(divs[j].textContent || '')) { dateDiv = divs[j]; break; }
      }
      if (!dateDiv) continue;
      var dateText = (dateDiv.textContent || '').replace(/\s/g, ' ');
      var m = dateText.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (!m) continue;
      var y = new Date().getFullYear();
      var parsed = y + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
      if (parsed !== todayStr) continue;

      var price = null, quantity = 0;
      var spans = block.querySelectorAll('span');
      for (var k = 0; k < spans.length; k++) {
        var t = (spans[k].textContent || '').trim();
        if (/만당\s*[\d,]+/.test(t)) {
          var num = parseFloat(t.replace(/[^\d.]/g, ''));
          if (!isNaN(num)) price = num;
        }
        if (t.indexOf('수량 부족') === -1 && t.indexOf('아데나') !== -1) {
          var n = parseFloat(t.replace(/[^\d.]/g, ''));
          if (!isNaN(n)) quantity = t.indexOf('만') !== -1 ? Math.round(n * 10000) : n;
        }
      }
      if (price != null) items.push({ quantity: quantity, price: price });
    }
    return items;
  }

  function payloadHash(serverCode, serverName, items) {
    if (!items || !items.length) return '';
    var parts = [String(serverCode), serverName, items.length];
    for (var i = 0; i < Math.min(5, items.length); i++) {
      parts.push(items[i].price + ',' + items[i].quantity);
    }
    return parts.join('|');
  }

  var lastPushedHash = '';

  function tryPush() {
    var server = getServerFromPage();
    if (server.serverCode == null) return;
    var items = extractItems();
    var hash = payloadHash(server.serverCode, server.serverName, items);
    if (hash === lastPushedHash) return;
    if (!items.length) return;

    fetch(API_BASE + '/api/collect/barotem/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverCode: server.serverCode,
        serverName: server.serverName,
        items: items
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok !== false) {
          lastPushedHash = hash;
          console.log('[바로템 푸시]', server.serverName || server.serverCode, data.count + '건 반영');
        }
      })
      .catch(function (e) {
        console.warn('[바로템 푸시] 실패', e.message);
      });
  }

  setInterval(tryPush, PUSH_INTERVAL_MS);
  setTimeout(tryPush, 3000);
})();
