// ==UserScript==
// @name         바로템 시세 푸시 (거래완료물품 - 서버 전체 한 페이지에서 수집)
// @description  게임머니 카테고리 거래완료 선택 시 서버 전체가 한 페이지에 있으므로, 개별 서버 스캔 없이 한 URL만 페이지네이션으로 수집합니다.
// @match        https://www.barotem.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  var API_BASE = 'https://game-price.onrender.com';
  var TABLE_URL = 'https://www.barotem.com/product/productTable/2382r902';
  var DISPLAY = 3; // 거래완료물품
  var PAGE_DELAY_MS = 600;
  var COLLECT_INTERVAL_MS = 2 * 60 * 1000;
  var lastFullScanDay = '';

  // 서버명 → 서버코드 (바로템 표기명 순서 = config.servers 순서)
  var SERVER_NAMES = [
    '데포로쥬', '켄라우헬', '질리언', '이실로테', '조우', '하딘', '케레니스', '오웬', '크리스터', '아인하사드',
    '아툰', '가드리아', '군터', '아스테어', '듀크데필', '발센', '어레인', '캐스톨', '세바스챤', '데컨',
    '파아그리오', '에바', '사이하', '마프르', '린델'
  ];
  var SERVERS = [24487, 24488, 24489, 24490, 24491, 24492, 24493, 24494, 24495, 24496, 24527, 24528, 24529, 24530, 24531, 24575, 24576, 24577, 24578, 24579, 24609, 24610, 24611, 24612, 24613];
  var nameToCode = {};
  for (var i = 0; i < SERVER_NAMES.length && i < SERVERS.length; i++) nameToCode[SERVER_NAMES[i]] = SERVERS[i];

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** 서버 전체 한 URL (opt1 없음) - 거래완료물품만 */
  function buildUrlAll(page) {
    var params = new URLSearchParams({
      page: String(page || 1),
      sell: 'sell',
      category: '',
      display: String(DISPLAY),
      orderby: 1,
      minpay: '', maxpay: '', search_word: '', brand: '', buyloc: '',
      opt1: '', opt2: '', opt3: '', opt4: '', opt5: '', opt6: '', opt7: '', opt8: '', opt9: '', opt10: ''
    });
    return TABLE_URL + '?' + params.toString();
  }

  function getMaxPage(doc) {
    var nav = doc.querySelector('nav.homePage');
    if (!nav) return 1;
    var lastLink = nav.querySelector('.pagination a[aria-label="마지막"]');
    if (lastLink && lastLink.getAttribute('href')) {
      var m = lastLink.getAttribute('href').match(/[?&]page=(\d+)/);
      if (m) return Math.max(1, parseInt(m[1], 10));
    }
    var links = nav.querySelectorAll('.pagination li a[href*="page="]');
    var max = 1;
    for (var i = 0; i < links.length; i++) {
      var m2 = links[i].getAttribute('href').match(/[?&]page=(\d+)/);
      if (m2) max = Math.max(max, parseInt(m2[1], 10));
    }
    return max;
  }

  /**
   * 한 페이지에서 항목별로 파싱: 서버명, 거래량, 날짜, 시간
   * - 서버명: div > div > span (데포로쥬 등)
   * - 거래량: ul.di_no_i 다음 span → "[수량 부족]"이면 분할(0), 아니면 거래 수량
   * - 날짜/시간: 마지막 div "02월 25일" + "04:46"
   */
  function parseItemsFromDocAll(doc, today) {
    var items = [];
    var blocks = doc.querySelectorAll('a.newlists_goods_content');
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];

      var serverName = '';
      var productNameParent = block.querySelector('p.product_name');
      if (productNameParent && productNameParent.parentElement) {
        var firstDiv = productNameParent.parentElement.querySelector('div');
        if (firstDiv) {
          var sp = firstDiv.querySelector('span');
          if (sp && sp.textContent) serverName = sp.textContent.trim();
        }
      }
      var serverCode = nameToCode[serverName];
      if (serverCode == null) serverCode = SERVERS[0];

      var dateDiv = null;
      var divs = block.querySelectorAll('div');
      for (var j = 0; j < divs.length; j++) {
        if (/\d{1,2}월\s*\d{1,2}일/.test(divs[j].textContent || '')) dateDiv = divs[j];
      }
      if (!dateDiv) continue;
      var dateText = (dateDiv.textContent || '').replace(/\s/g, ' ');
      var m = dateText.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (!m) continue;
      var y = new Date().getFullYear();
      var parsed = y + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
      if (parsed !== today) continue;

      var price = null;
      var quantity = 0;
      var ul = block.querySelector('ul.di_no_i');
      if (ul && ul.nextElementSibling) {
        var qSpan = ul.nextElementSibling;
        var qText = (qSpan.textContent || '').trim();
        if (qText.indexOf('수량 부족') !== -1) quantity = 0;
        else if (qText.indexOf('아데나') !== -1) {
          var n = parseFloat(qText.replace(/[^\d.]/g, ''));
          if (!isNaN(n)) quantity = qText.indexOf('만') !== -1 ? Math.round(n * 10000) : n;
        }
      }
      var spans = block.querySelectorAll('span');
      for (var k = 0; k < spans.length; k++) {
        var t = (spans[k].textContent || '').trim();
        if (/만당\s*[\d,]+/.test(t)) {
          var num = parseFloat(t.replace(/[^\d.]/g, ''));
          if (!isNaN(num)) price = num;
        }
      }
      if (price == null) continue;

      var productId = block.getAttribute('id') || null;
      items.push({ id: productId, serverCode: serverCode, serverName: serverName, quantity: quantity, price: price });
    }
    return items;
  }

  function delay(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function pushOne(serverCode, serverName, items) {
    return fetch(API_BASE + '/api/collect/barotem/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverCode: serverCode, serverName: serverName, items: items })
    }).then(function (r) { return r.json(); });
  }

  function collectAll() {
    var today = todayStr();
    var doFullScan = today !== lastFullScanDay;
    if (doFullScan) lastFullScanDay = today;

    var url1 = buildUrlAll(1);
    fetch(url1, { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html1) {
        var parser = new DOMParser();
        var doc1 = parser.parseFromString(html1, 'text/html');
        var allItems = parseItemsFromDocAll(doc1, today);

        if (!doFullScan) {
          return groupByServerAndPush(allItems).then(function () {
            console.log('[바로템 푸시] 추가체크 완료');
          });
        }

        var maxPage = getMaxPage(doc1);
        if (maxPage <= 1) {
          return groupByServerAndPush(allItems).then(function () {
            console.log('[바로템 푸시] 풀스캔 완료 (1p)');
          });
        }

        var page = 2;
        function fetchNext() {
          if (page > maxPage) {
            return groupByServerAndPush(allItems).then(function () {
              console.log('[바로템 푸시] 풀스캔 완료 (1~' + maxPage + 'p)');
            });
          }
          return fetch(buildUrlAll(page), { credentials: 'same-origin' })
            .then(function (r) { return r.text(); })
            .then(function (html) {
              var doc = parser.parseFromString(html, 'text/html');
              var list = parseItemsFromDocAll(doc, today);
              for (var i = 0; i < list.length; i++) allItems.push(list[i]);
              page++;
              return delay(PAGE_DELAY_MS).then(fetchNext);
            });
        }
        return delay(PAGE_DELAY_MS).then(fetchNext);
      })
      .catch(function (e) {
        console.warn('[바로템 푸시] 실패', e.message);
      });
  }

  function groupByServerAndPush(allItems) {
    var byServer = {};
    for (var i = 0; i < allItems.length; i++) {
      var it = allItems[i];
      var key = String(it.serverCode);
      if (!byServer[key]) byServer[key] = { serverCode: it.serverCode, serverName: it.serverName || '', items: [] };
      byServer[key].items.push({ id: it.id, quantity: it.quantity, price: it.price });
    }
    var keys = Object.keys(byServer);
    var i = 0;
    function next() {
      if (i >= keys.length) return Promise.resolve();
      var k = keys[i++];
      var s = byServer[k];
      return pushOne(s.serverCode, s.serverName, s.items).then(function (data) {
        if (s.items.length > 0 && data && data.ok !== false) {
          if (data.added > 0) console.log('[바로템 푸시]', s.serverName || s.serverCode, s.items.length + '건 (+' + data.added + ')');
          else console.log('[바로템 푸시]', s.serverName || s.serverCode, s.items.length + '건');
        }
        return delay(400).then(next);
      });
    }
    return next();
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  setTimeout(collectAll, 5000);
})();
