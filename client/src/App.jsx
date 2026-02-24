import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { useWebSocket } from './useWebSocket';
import { getSummary, getHistory, getTrades, getChat, triggerParse } from './api';
import { SummaryCard } from './components/SummaryCard';
import { PriceChart } from './components/PriceChart';
import { TradesTable } from './components/TradesTable';
import { Chat } from './components/Chat';
import DashboardView from './dashboard/DashboardView';
import './dashboard/dashboard.css';

const USE_DASHBOARD_VIEW = true;

export default function App() {
  if (USE_DASHBOARD_VIEW) return <DashboardView />;

  const [summary, setSummary] = useState({ barotem: null });
  const [history, setHistory] = useState({ barotem: [] });
  const [trades, setTrades] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');

  const handleWs = useCallback((msg) => {
    switch (msg.type) {
      case 'summary':
        if (msg.payload) setSummary(msg.payload);
        break;
      case 'prices':
        if (msg.payload) setSummary((s) => ({ ...s, ...msg.payload }));
        break;
      case 'trades':
        if (msg.payload) setTrades(msg.payload);
        break;
      case 'chat':
        if (msg.payload) setChatMessages((prev) => [msg.payload, ...prev]);
        break;
      case 'chat_history':
        if (msg.payload) setChatMessages(msg.payload);
        break;
      default:
        break;
    }
  }, []);

  const { connected } = useWebSocket(handleWs);

  useEffect(() => {
    getSummary().then(setSummary);
    getHistory('barotem').then((res) => setHistory((h) => ({ ...h, barotem: res.data || [] })));
    getTrades(50).then(setTrades);
    getChat(100).then(setChatMessages);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>게임머니 시세 중계</h1>
        <span className={`ws-badge ${connected ? 'on' : ''}`}>{connected ? '실시간 연결됨' : '연결 대기'}</span>
        <button
          type="button"
          className="parse-btn"
          disabled={parsing}
          onClick={async () => {
            setParsing(true);
            setParseMessage('');
            try {
              const result = await triggerParse();
              const count = result?.count ?? 0;
              setParseMessage(`수집 완료 (${count}건)`);
              const [s, h, t] = await Promise.all([getSummary(), getHistory('barotem'), getTrades(50)]);
              setSummary(s);
              setHistory((prev) => ({ ...prev, barotem: h.data || [] }));
              setTrades(t);
            } catch (e) {
              setParseMessage('실패: ' + (e?.message || '서버 연결 확인'));
            } finally {
              setParsing(false);
              setTimeout(() => setParseMessage(''), 4000);
            }
          }}
        >
          {parsing ? '수집 중…' : '지금 수집'}
        </button>
        {parseMessage && <span className={`parse-status ${parseMessage.startsWith('실패') ? 'err' : 'ok'}`}>{parseMessage}</span>}
      </header>

      <section className="summary-section">
        <SummaryCard source="barotem" data={summary.barotem} />
      </section>

      <section className="chart-section">
        <PriceChart source="barotem" data={history.barotem} />
      </section>

      <section className="content-grid">
        <TradesTable trades={trades} />
        <Chat messages={chatMessages} />
      </section>

      <footer className="footer">
        리니지 클래식 등 중계 사이트 시세는 1분 단위로 수집됩니다. 투자 판단은 본인 책임입니다.
      </footer>
    </div>
  );
}
