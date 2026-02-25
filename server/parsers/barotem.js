/**
 * 바로템 거래종료 물품 파서 - 당일만, 거래양/거래금액 추출
 */
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildUrl(overrides = {}) {
  const q = { ...config.barotem.query, ...overrides };
  const base = config.barotem.listUrl;
  const params = new URLSearchParams({
    page: q.page,
    sell: q.sell,
    category: q.category || '',
    display: String(q.display),
    orderby: q.orderby,
    minpay: q.minpay || '',
    maxpay: q.maxpay || '',
    search_word: q.search_word || '',
    brand: q.brand || '',
    buyloc: q.buyloc || '',
    opt1: String(q.opt1 || ''),
    opt2: q.opt2 || '',
    opt3: q.opt3 || '',
    opt4: q.opt4 || '',
    opt5: q.opt5 || '',
    opt6: q.opt6 || '',
    opt7: q.opt7 || '',
    opt8: q.opt8 || '',
    opt9: q.opt9 || '',
    opt10: q.opt10 || ''
  });
  return `${base}?${params.toString()}`;
}

function parseNumber(str) {
  if (str == null || str === '') return null;
  const s = String(str).replace(/[^\d.]/g, '');
  return s ? parseFloat(s) : null;
}

function todayStr() {
  return new Date().toLocaleString('en-CA', { timeZone: 'Asia/Seoul' }).slice(0, 10);
}

/** "02월 24일" "16:58" 형태 파싱 후 당일 여부 */
function isToday(dateStr) {
  if (!dateStr) return false;
  const s = String(dateStr).replace(/\s/g, ' ').trim();
  const dateMatch = s.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (!dateMatch) {
    const fallback = s.match(/(\d{4})[.\-/]?(\d{1,2})[.\-/]?(\d{1,2})/);
    if (!fallback) return false;
    const [, y, m, d] = fallback;
    const parsed = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return parsed === todayStr();
  }
  const [, month, day] = dateMatch;
  const y = new Date().getFullYear();
  const parsed = `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return parsed === todayStr();
}

/**
 * 물품리스트 > 거래완료물품 구조 파싱
 * - .lists_product_contents a.newlists_goods_content (물품 게시판 한 행): 만당·수량·NN월 NN일 추출
 * - 없으면 ul.di_no_i 블록 단위 fallback
 */
async function parseBarotemPage(html) {
  const $ = cheerio.load(html);
  const results = [];
  const today = todayStr();

  $('a.newlists_goods_content').each((_, blockEl) => {
    const $block = $(blockEl);
    const dateDiv = $block.find('div').filter((i, el) => /\d{1,2}월\s*\d{1,2}일/.test($(el).text()));
    const dateStr = dateDiv.length ? dateDiv.last().text().trim() : '';
    if (!isToday(dateStr)) return;

    let price = null;
    $block.find('span').each((__, spanEl) => {
      const raw = $(spanEl).text().trim();
      if (/만당\s*[\d,]+|만당\s*[\d,]+원/.test(raw)) {
        const num = parseNumber(raw);
        if (num != null) price = num;
      }
    });
    if (price == null) return;

    let quantity = 0;
    $block.find('span').each((__, spanEl) => {
      const raw = $(spanEl).text().trim();
      if (raw.includes('수량 부족')) return;
      if (raw.includes('아데나')) {
        const num = parseNumber(raw);
        if (num != null) quantity = raw.includes('만') ? Math.round(num * 10000) : num;
      }
    });
    const id = $block.attr('id') ? String($block.attr('id')) : null;
    results.push({ id, quantity, price });
  });
  if (results.length > 0) return results;

  $('ul.di_no_i').each((_, ulEl) => {
    const $ul = $(ulEl);
    const $block = $ul.closest('li, .item, [class*="list"], [class*="product"]').length
      ? $ul.closest('li, .item, [class*="list"], [class*="product"]')
      : $ul.parent();

    const dateDiv = $block.find('div').filter((i, el) => /월\s*일|^\d{1,2}월/.test($(el).text()));
    const dateStr = dateDiv.length ? dateDiv.first().text().trim() : '';
    if (!isToday(dateStr)) return;

    let price = null;
    $block.find('span').each((__, spanEl) => {
      const raw = $(spanEl).text().trim();
      if (/만당\s*[\d,]+|만당\s*[\d,]+원/.test(raw)) {
        const num = parseNumber(raw);
        if (num != null) price = num;
      }
    });
    if (price == null) return;

    let quantity = null;
    $block.find('span').each((__, spanEl) => {
      const raw = $(spanEl).text().trim();
      if (raw.includes('수량 부족')) return;
      if (raw.includes('아데나')) {
        const num = parseNumber(raw);
        if (num != null) {
          if (raw.includes('만')) quantity = Math.round(num * 10000);
          else quantity = num;
        }
      }
    });

    results.push({ quantity: quantity ?? 0, price });
  });

  if (results.length === 0 && /만당\s*[\d,]+원|만당\s*[\d,]+/.test(html) && /\d{1,2}월\s*\d{1,2}일/.test(html)) {
    const mandangMatches = html.match(/만당\s*([\d,]+)\s*원?/g);
    const dateMatches = html.match(/(\d{1,2})월\s*(\d{1,2})일/g) || [];
    const today = todayStr();
    dateMatches.forEach((dateStr, i) => {
      const m = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
      if (!m) return;
      const parsed = `${new Date().getFullYear()}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
      if (parsed !== today) return;
      const priceRaw = mandangMatches && mandangMatches[i] ? mandangMatches[i] : mandangMatches && mandangMatches[0];
      if (priceRaw) {
        const num = parseNumber(priceRaw);
        if (num != null) results.push({ quantity: 0, price: num });
      }
    });
    if (results.length === 0 && mandangMatches && mandangMatches.length) {
      const num = parseNumber(mandangMatches[0]);
      if (num != null && dateMatches.some((d) => isToday(d))) results.push({ quantity: 0, price: num });
    }
  }

  return results;
}

async function fetchBarotem() {
  const url = buildUrl();
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    const items = await parseBarotemPage(data);
    return { source: 'barotem', items, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.error('Barotem fetch error:', err.message);
    return { source: 'barotem', items: [], error: err.message, fetchedAt: new Date().toISOString() };
  }
}

/** 팝니다·당일 거래완료: 서버 하나에 대해 목록 요청 후 물량/체결가 파싱 */
async function fetchBarotemForServer(serverCode) {
  const display = config.barotem.displayCompleted ?? 3;
  const url = buildUrl({ opt1: String(serverCode), display });
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    const items = await parseBarotemPage(data);
    return { serverCode, items, fetchedAt: new Date().toISOString() };
  } catch (err) {
    console.error(`Barotem fetch server ${serverCode} error:`, err.message);
    return { serverCode, items: [], error: err.message, fetchedAt: new Date().toISOString() };
  }
}

/** 팝니다·서버별 당일 거래완료 전체 수집 (거래 물량 + 체결가) */
async function fetchBarotemAllServers() {
  const servers = config.barotem.servers || [];
  const byServer = [];
  const allItems = [];
  for (const serverCode of servers) {
    const result = await fetchBarotemForServer(serverCode);
    byServer.push({ serverCode, items: result.items, error: result.error });
    (result.items || []).forEach((item) => allItems.push({ ...item, serverCode }));
  }
  return {
    source: 'barotem',
    byServer,
    items: allItems,
    fetchedAt: new Date().toISOString()
  };
}

async function parseBarotemHTML(html) {
  const items = await parseBarotemPage(html);
  return { source: 'barotem', items, fetchedAt: new Date().toISOString() };
}

module.exports = {
  fetchBarotem,
  fetchBarotemForServer,
  fetchBarotemAllServers,
  parseBarotemHTML,
  parseBarotemPage,
  buildUrl
};
