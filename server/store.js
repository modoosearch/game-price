const fs = require('fs');
const path = require('path');
const config = require('./config');
const barotemParser = require('./parsers/barotem');
const barotemBrowser = require('./parsers/barotem-browser');

const SNAPSHOT_DIR = path.join(__dirname, 'data');
const BAROTEM_SNAPSHOT_PATH = path.join(SNAPSHOT_DIR, 'barotem-snapshot.json');

const priceHistory = { barotem: [] };
const MAX_HISTORY = 24 * 60;
const recentTrades = [];
const MAX_TRADES = 500;
let lastBarotemByServer = [];
const chatMessages = [];
const MAX_CHAT = 200;

let currentDayKey = getCurrentDayKey();

/** 당일 기준: 새벽 00:00(KST)~다음날 00:00 전까지 수집, 다음날 00:00 되면 자동 초기화 후 그날 것만 파싱 반복 */
function getCurrentDayKey() {
  const now = new Date();
  return now.toLocaleString('en-CA', { timeZone: 'Asia/Seoul' }).slice(0, 10);
}

function resetIfNewDay() {
  const today = getCurrentDayKey();
  if (today === currentDayKey) return;
  currentDayKey = today;

  Object.keys(priceHistory).forEach((source) => {
    priceHistory[source] = [];
  });
  recentTrades.length = 0;
  lastBarotemByServer = [];
}

function addPriceSnapshot(source, data) {
  if (!priceHistory[source]) priceHistory[source] = [];
  const list = priceHistory[source];
  const now = new Date();
  const snapshot = {
    time: now.toISOString(),
    ts: now.getTime(),
    avgPrice: data.avgPrice ?? 0,
    totalQuantity: data.totalQuantity ?? 0,
    totalAmount: data.totalAmount ?? 0,
    count: data.count ?? 0,
    items: data.items ?? []
  };
  list.push(snapshot);
  if (list.length > MAX_HISTORY) list.shift();
  return snapshot;
}

function addTrades(source, items) {
  const now = new Date().toISOString();
  items.forEach((item, i) => {
    recentTrades.unshift({
      id: `${source}-${now}-${i}`,
      source,
      quantity: item.quantity,
      price: item.price,
      time: now,
      serverCode: item.serverCode
    });
  });
  while (recentTrades.length > MAX_TRADES) recentTrades.pop();
}

function getPriceHistory(source, fromTs) {
  const list = priceHistory[source] || [];
  if (fromTs) return list.filter((s) => s.ts >= fromTs);
  return [...list];
}

function getRecentTrades(limit = 50) {
  return recentTrades.slice(0, limit);
}

function addChatMessage(nick, message) {
  const msg = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    nick: (nick || '익명').slice(0, 20),
    message: String(message).slice(0, 500),
    time: new Date().toISOString()
  };
  chatMessages.unshift(msg);
  if (chatMessages.length > MAX_CHAT) chatMessages.pop();
  return msg;
}

function getChatMessages(limit = 100) {
  return chatMessages.slice(0, limit);
}

function getSummary(source) {
  const list = priceHistory[source] || [];
  if (list.length === 0) return null;
  const latest = list[list.length - 1];
  const prev = list.length >= 2 ? list[list.length - 2] : null;
  let changePercent = null;
  if (prev && prev.avgPrice > 0) {
    changePercent = ((latest.avgPrice - prev.avgPrice) / prev.avgPrice) * 100;
  }
  return {
    source,
    avgPrice: latest.avgPrice,
    totalQuantity: latest.totalQuantity,
    totalAmount: latest.totalAmount,
    count: latest.count,
    changePercent,
    time: latest.time
  };
}

function readBarotemSnapshot() {
  try {
    const raw = fs.readFileSync(BAROTEM_SNAPSHOT_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function writeBarotemSnapshot(data) {
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    fs.writeFileSync(BAROTEM_SNAPSHOT_PATH, JSON.stringify(data, null, 0), 'utf8');
  } catch (e) {
    console.error('[store] barotem snapshot write failed', e.message);
  }
}

async function runBarotemParse() {
  resetIfNewDay();
  const useBrowser = config.barotem && config.barotem.useBrowserParser === true;
  const result = useBrowser
    ? await barotemBrowser.fetchBarotemAllServersBrowser()
    : await barotemParser.fetchBarotemAllServers();
  const items = result.items || [];
  lastBarotemByServer = result.byServer || [];

  const prev = readBarotemSnapshot();
  const prevByServer = {};
  if (prev && Array.isArray(prev.byServer)) {
    prev.byServer.forEach((s) => { prevByServer[String(s.serverCode)] = s.items || []; });
  }
  const newItems = [];
  (result.byServer || []).forEach((s) => {
    const prevIds = new Set((prevByServer[String(s.serverCode)] || []).map((i) => String(i.id)).filter(Boolean));
    (s.items || []).forEach((it) => {
      if (it.id && !prevIds.has(String(it.id))) newItems.push({ ...it, serverCode: s.serverCode });
    });
  });

  const count = items.length;
  const totalAmount = items.reduce((s, i) => s + (i.price || 0), 0);
  const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const avgPrice = count > 0 ? totalAmount / count : 0;
  addPriceSnapshot('barotem', { avgPrice, totalQuantity, totalAmount, count, items });
  if (newItems.length > 0) addTrades('barotem', newItems);

  writeBarotemSnapshot({ byServer: result.byServer, fetchedAt: result.fetchedAt });
  return { ...result, avgPrice, totalQuantity, totalAmount, count, added: newItems.length };
}

function getBarotemByServer() {
  return lastBarotemByServer;
}

/** 브라우저 푸시로 서버 하나 갱신 (서버별 목록에 반영, id 있으면 병합용으로 보관) */
function pushBarotemByServer(serverCode, serverName, items) {
  const list = lastBarotemByServer.filter((s) => String(s.serverCode) !== String(serverCode));
  list.unshift({
    serverCode,
    serverName,
    items: (items || []).map((it) => ({
      id: it.id ? String(it.id) : undefined,
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0
    }))
  });
  lastBarotemByServer = list;
}

module.exports = {
  addPriceSnapshot,
  addTrades,
  getPriceHistory,
  getRecentTrades,
  getBarotemByServer,
  pushBarotemByServer,
  addChatMessage,
  getChatMessages,
  getSummary,
  runBarotemParse,
  priceHistory,
  recentTrades
};
