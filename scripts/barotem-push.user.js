// ==UserScript==
// @name         바로템 시세 푸시 (거래완료물품 - 서버별 수집)
// @description  바로템 거래완료물품을 서버별 URL로 fetch 해서 서버명·거래량·가격·날짜 파싱 후 aden.infosearch.kr 으로 푸시
// @match        https://www.barotem.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  var API_BASE = 'https://aden.infosearch.kr';
  var TABLE_URL = 'https://www.barotem.com/product/productTable/2382r902';
  var DISPLAY = 3; // 거래완료물품
  var SERVER_DELAY_MS = 2000;
  var PAGE_DELAY_MS = 500;
  var COLLECT_INTERVAL_MS = 2 * 60 * 1000;
  var lastFullScanDay = '';

  var SERVER_NAMES = [
    '데포로쥬', '켄라우헬', '질리언', '이실로테', '조우', '하딘', '케레니스', '오웬', '크리스터', '아인하사드',
    '아툰', '가드리아', '군터', '아스테어', '듀크데필', '발센', '어레인', '캐스톨', '세바스챤', '데컨',
    '파아그리오', '에바', '사이하', '마프르', '린델'
  ];
  var SERVERS = [24487, 24488, 24489, 24490, 24491, 24492, 24493, 24494, 24495, 24496, 24527, 24528, 24529, 24530, 24531, 24575, 24576, 24577, 24578, 24579, 24609, 24610, 24611, 24612, 24613];

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function buildUrl(serverCode, page) {
    var params = new URLSearchParams({
      page: String(page || 1),
      sell: 'sell', category: '', display: String(DISPLAY), orderby: 1,
      minpay: '', maxpay: '', search_word: '', brand: '', buyloc: '',
      opt1: String(serverCode),
      opt2: '', opt3: '', opt4: '', opt5: '', opt6: '', opt7: '', opt8: '', opt9: '', opt10: ''
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

  /** 한 페이지 HTML에서 거래완료 항목 파싱: 서버명, 거래량, 가격, 날짜(당일만) */
  function parseItemsFromDoc(doc, serverCode, serverNameFallback, today) {
    var items = [];
    var blocks = doc.querySelectorAll('a.newlists_goods_content');
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var serverName = serverNameFallback || '';
      var productNameParent = block.querySelector('p.product_name');
      if (productNameParent && productNameParent.parentElement) {
        var firstDiv = productNameParent.parentElement.querySelector('div');
        if (firstDiv) {
          var sp = firstDiv.querySelector('span');
          if (sp && sp.textContent) serverName = sp.textContent.trim();
        }
      }

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
    })
      .then(function (r) {
        if (!r.ok) console.warn('[바로템 푸시] API HTTP', r.status, r.statusText);
        return r.json();
      })
      .catch(function (e) {
        console.warn('[바로템 푸시] API 요청 실패 (네트워크/CORS 등)', e.message);
        return { ok: false, error: e.message };
      });
  }

  function collectAll() {
    var today = todayStr();
    var doFullScan = today !== lastFullScanDay;
    if (doFullScan) lastFullScanDay = today;
    console.log('[바로템 푸시] 수집 시도 시작', doFullScan ? '(풀스캔)' : '(추가체크)', '당일=' + today);

    var idx = 0;
    function next() {
      if (idx >= SERVERS.length) {
        console.log('[바로템 푸시] 전 서버 ' + (doFullScan ? '풀스캔' : '추가체크') + ' 완료');
        return;
      }
      var serverCode = SERVERS[idx];
      var serverNameFallback = SERVER_NAMES[idx] || '';
      idx++;

      var url1 = buildUrl(serverCode, 1);
      console.log('[바로템 푸시] fetch', serverNameFallback, 'opt1=' + serverCode);
      fetch(url1, { credentials: 'same-origin' })
        .then(function (r) {
          if (!r.ok) console.warn('[바로템 푸시] HTTP', r.status, serverNameFallback);
          return r.text();
        })
        .then(function (html1) {
          var blockCount = (html1.match(/newlists_goods_content/g) || []).length;
          console.log('[바로템 푸시] 수신', serverNameFallback, 'HTML길이=' + html1.length, '블록(대략)=' + blockCount);
          var parser = new DOMParser();
          var doc1 = parser.parseFromString(html1, 'text/html');
          var allItems = parseItemsFromDoc(doc1, serverCode, serverNameFallback, today);
          console.log('[바로템 푸시] 파싱', serverNameFallback, '당일거래=' + allItems.length + '건');

          if (allItems.length === 0 && blockCount === 0) {
            console.warn('[바로템 푸시] 페이지에 newlists_goods_content 없음 - URL/거래완료 선택 여부 확인');
          }

          if (!doFullScan) {
            return pushOne(serverCode, serverNameFallback, allItems).then(function (data) {
              console.log('[바로템 푸시] 푸시응답', serverNameFallback, data && data.ok ? 'ok count=' + (data.count) + ' added=' + (data.added) : (data && data.error) || 'fail');
              return delay(SERVER_DELAY_MS);
            });
          }

          var maxPage = getMaxPage(doc1);
          if (maxPage <= 1) {
            return pushOne(serverCode, serverNameFallback, allItems).then(function (data) {
              console.log('[바로템 푸시] 푸시응답', serverNameFallback, allItems.length + '건', data && data.ok ? 'ok' : (data && data.error) || '');
              return delay(SERVER_DELAY_MS);
            });
          }

          var page = 2;
          function fetchNext() {
            if (page > maxPage) {
              return pushOne(serverCode, serverNameFallback, allItems).then(function (data) {
                console.log('[바로템 푸시] 푸시응답', serverNameFallback, '총' + allItems.length + '건(1~' + maxPage + 'p)', data && data.ok ? 'ok' : (data && data.error) || '');
                return delay(SERVER_DELAY_MS);
              });
            }
            return fetch(buildUrl(serverCode, page), { credentials: 'same-origin' })
              .then(function (r) { return r.text(); })
              .then(function (html) {
                var doc = parser.parseFromString(html, 'text/html');
                var list = parseItemsFromDoc(doc, serverCode, serverNameFallback, today);
                for (var i = 0; i < list.length; i++) allItems.push(list[i]);
                page++;
                return delay(PAGE_DELAY_MS).then(fetchNext);
              });
          }
          return delay(PAGE_DELAY_MS).then(fetchNext);
        })
        .then(function () { next(); })
        .catch(function (e) {
          console.warn('[바로템 푸시] 서버 ' + serverCode + ' ' + serverNameFallback + ' 실패', e.message);
          delay(SERVER_DELAY_MS).then(next);
        });
    }
    next();
  }

  setInterval(collectAll, COLLECT_INTERVAL_MS);
  setTimeout(collectAll, 5000);
})();
