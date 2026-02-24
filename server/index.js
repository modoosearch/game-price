const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const store = require('./store');
const config = require('./config');

const app = express();
app.use(cors());
app.use(express.json());

// 웹호스팅: 빌드된 프론트 서빙 (npm run build 후)
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.get('/api/summary', (req, res) => {
  const barotem = store.getSummary('barotem');
  res.json({ barotem, sources: ['barotem'] });
});

app.get('/api/history', (req, res) => {
  const source = req.query.source || 'barotem';
  const from = req.query.from ? Number(req.query.from) : null;
  const history = store.getPriceHistory(source, from);
  res.json({ source, data: history });
});

app.get('/api/trades', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json(store.getRecentTrades(limit));
});

/** 서버별 당일 거래완료: 거래 물량(quantity) + 체결가(price) */
app.get('/api/barotem/by-server', (req, res) => {
  res.json(store.getBarotemByServer());
});

app.get('/api/chat', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  res.json(store.getChatMessages(limit));
});

app.post('/api/chat', (req, res) => {
  const { nick, message } = req.body || {};
  const msg = store.addChatMessage(nick, message);
  broadcast({ type: 'chat', payload: msg });
  res.json(msg);
});

/** 브라우저(사용자 스크립트/확장 등)에서 바로템 DOM을 파싱해 푸시하는 엔드포인트 */
app.post('/api/collect/barotem/push', (req, res) => {
  try {
    const { serverCode, serverName, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ ok: true, count: 0 });
    }
    const normalized = items.map((it) => ({
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0,
      serverCode,
      serverName
    }));
    const count = normalized.length;
    const totalAmount = normalized.reduce((s, i) => s + (i.price || 0), 0);
    const totalQuantity = normalized.reduce((s, i) => s + (i.quantity || 0), 0);
    const avgPrice = count > 0 ? totalAmount / count : 0;

    store.addTrades('barotem', normalized);
    store.addPriceSnapshot('barotem', { avgPrice, totalQuantity, totalAmount, count, items: normalized });
    store.pushBarotemByServer(serverCode, serverName || '', normalized);

    broadcast({ type: 'prices', payload: { barotem: store.getSummary('barotem') } });
    broadcast({ type: 'trades', payload: store.getRecentTrades(20) });
    broadcast({ type: 'byServer', payload: store.getBarotemByServer() });

    res.json({ ok: true, count, avgPrice, totalQuantity, totalAmount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/parse/barotem', async (req, res) => {
  try {
    const result = await store.runBarotemParse();
    broadcast({ type: 'prices', payload: { barotem: store.getSummary('barotem') } });
    broadcast({ type: 'trades', payload: store.getRecentTrades(20) });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** 디버그: 서버 하나 요청해서 HTML 구조 확인 (실시간 거래가 0건 원인 파악용) */
app.get('/api/debug/barotem-html', async (req, res) => {
  const barotemParser = require('./parsers/barotem');
  const serverCode = req.query.server || config.barotem.servers[0];
  const axios = require('axios');
  const url = barotemParser.buildUrl({ opt1: String(serverCode), display: config.barotem.displayCompleted });
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
      timeout: 15000
    });
    const hasDiNoI = data.includes('di_no_i');
    const hasMandang = data.includes('만당');
    const hasMulpum = data.includes('물품리스트');
    const diNoICount = (data.match(/di_no_i/g) || []).length;
    const snippet = hasDiNoI ? data.substring(data.indexOf('di_no_i') - 100, data.indexOf('di_no_i') + 500) : (data.substring(0, 2000));
    res.json({
      url,
      htmlLength: data.length,
      hasDiNoI,
      hasMandang,
      hasMulpum,
      diNoICount,
      snippet: snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 1500)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/parse/barotem/html', async (req, res) => {
  const barotemParser = require('./parsers/barotem');
  try {
    const html = req.body?.html ?? '';
    const result = await barotemParser.parseBarotemHTML(html);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA: API가 아닌 요청은 index.html (배포 시에만)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(data);
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected' }));
  ws.send(JSON.stringify({ type: 'summary', payload: { barotem: store.getSummary('barotem') } }));
  ws.send(JSON.stringify({ type: 'trades', payload: store.getRecentTrades(30) }));
  ws.send(JSON.stringify({ type: 'byServer', payload: store.getBarotemByServer() }));
  ws.send(JSON.stringify({ type: 'chat_history', payload: store.getChatMessages(50) }));
});

// 1분마다 바로템 서버별 당일 거래완료 수집
const PARSE_INTERVAL_MS = config.parseIntervalMs ?? 60 * 1000;

function runBarotemParseJob() {
  store.runBarotemParse().then((result) => {
    broadcast({ type: 'prices', payload: { barotem: store.getSummary('barotem') } });
    broadcast({ type: 'trades', payload: store.getRecentTrades(20) });
    broadcast({ type: 'byServer', payload: store.getBarotemByServer() });
    console.log('[1min] barotem parsed', result.count ?? 0, 'items');
  }).catch((e) => {
    console.error('[1min] parse error', e.message);
  });
}

setInterval(runBarotemParseJob, PARSE_INTERVAL_MS);
if (config.barotem && config.barotem.useBrowserParser) {
  setTimeout(runBarotemParseJob, 5000);
} else {
  runBarotemParseJob();
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server http://localhost:' + PORT + ' (WS /ws)'));
