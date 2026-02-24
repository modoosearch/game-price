/**
 * 바로템 거래완료 수집 - 헤드리스 브라우저 사용
 * 고객은 우리 웹만 쓰면 되고, 서버에서 직접 DOM 수집
 */
const config = require('../config');

const listUrl = config.barotem.listUrl;
const display = config.barotem.displayCompleted ?? 3;
const servers = config.barotem.servers || [];
const serverDelayMs = config.barotem.serverDelayMs ?? 2500;
const pageTimeoutMs = config.barotem.pageTimeoutMs ?? 20000;

function buildUrl(serverCode) {
  const params = new URLSearchParams({
    page: 1,
    sell: 'sell',
    category: '',
    display: String(display),
    orderby: 1,
    minpay: '',
    maxpay: '',
    search_word: '',
    brand: '',
    buyloc: '',
    opt1: String(serverCode),
    opt2: '', opt3: '', opt4: '', opt5: '', opt6: '', opt7: '', opt8: '', opt9: '', opt10: ''
  });
  return `${listUrl}?${params.toString()}`;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 페이지 내에서 거래완료 물품 + 선택 서버명 추출 (브라우저 context)
 */
function getExtractScript(today) {
  return `
    (function(todayStr) {
      var serverName = '';
      var li = document.querySelector('li[data-title="opt1"].on') || document.querySelector('li[data-opt1].on');
      if (li) {
        var p = li.querySelector('p');
        serverName = (p && p.textContent) ? p.textContent.trim() : '';
      }
      var items = [];
      var uls = document.querySelectorAll('ul.di_no_i');
      for (var i = 0; i < uls.length; i++) {
        var ul = uls[i];
        var block = ul.closest('li') || ul.closest('.item') || ul.closest('[class*="list"]') || ul.parentElement;
        if (!block) continue;
        var dateDiv = null;
        var divs = block.querySelectorAll('div');
        for (var j = 0; j < divs.length; j++) {
          if (/\\d{1,2}월\\s*\\d{1,2}일/.test(divs[j].textContent || '')) { dateDiv = divs[j]; break; }
        }
        if (!dateDiv) continue;
        var dateText = (dateDiv.textContent || '').replace(/\\s/g, ' ');
        var m = dateText.match(/(\\d{1,2})월\\s*(\\d{1,2})일/);
        if (!m) continue;
        var y = new Date().getFullYear();
        var parsed = y + '-' + m[1].padStart(2,'0') + '-' + m[2].padStart(2,'0');
        if (parsed !== todayStr) continue;

        var price = null, quantity = 0;
        var spans = block.querySelectorAll('span');
        for (var k = 0; k < spans.length; k++) {
          var t = (spans[k].textContent || '').trim();
          if (/만당\\s*[\\d,]+/.test(t)) {
            var num = parseFloat(t.replace(/[^\\d.]/g, ''));
            if (!isNaN(num)) price = num;
          }
          if (t.indexOf('수량 부족') === -1 && t.indexOf('아데나') !== -1) {
            var n = parseFloat(t.replace(/[^\\d.]/g, ''));
            if (!isNaN(n)) quantity = t.indexOf('만') !== -1 ? Math.round(n * 10000) : n;
          }
        }
        if (price != null) items.push({ quantity: quantity, price: price });
      }
      return { serverName: serverName, items: items };
    })('${today}')
  `;
}

/**
 * 서버 하나에 대해 브라우저로 열어서 수집
 */
async function fetchOneServer(page, serverCode) {
  const url = buildUrl(serverCode);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: pageTimeoutMs });
    await delay(1500);
    const out = await page.evaluate(getExtractScript(todayStr()));
    const data = out && typeof out === 'object' ? out : { serverName: '', items: [] };
    const items = Array.isArray(data.items) ? data.items : [];
    return { serverCode, serverName: data.serverName || '', items, error: null };
  } catch (e) {
    return { serverCode, serverName: '', items: [], error: e.message };
  }
}

/**
 * 전체 서버 수집 (브라우저 한 번 띄우고 서버마다 이동, 딜레이로 트래픽 완화)
 */
async function fetchBarotemAllServersBrowser() {
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    const byServer = [];
    const allItems = [];

    for (let i = 0; i < servers.length; i++) {
      const serverCode = servers[i];
      const result = await fetchOneServer(page, serverCode);
      byServer.push({ serverCode, serverName: result.serverName, items: result.items || [], error: result.error });
      (result.items || []).forEach((item) => allItems.push({ ...item, serverCode }));
      if (i < servers.length - 1) await delay(serverDelayMs);
    }

    await browser.close();
    return {
      source: 'barotem',
      byServer,
      items: allItems,
      fetchedAt: new Date().toISOString()
    };
  } catch (e) {
    if (browser) try { await browser.close(); } catch (_) {}
    console.error('[barotem-browser]', e.message);
    return {
      source: 'barotem',
      byServer: [],
      items: [],
      error: e.message,
      fetchedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  fetchBarotemAllServersBrowser,
  fetchOneServer,
  buildUrl
};
