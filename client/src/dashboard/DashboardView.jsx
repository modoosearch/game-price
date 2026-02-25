import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../useWebSocket';
import { getSummary, getHistory, getTrades, getChat, getByServer, triggerParse } from '../api';
import { ServerList } from './ServerList';
import { ServerChart } from './ServerChart';
import { Board } from './Board';

export default function DashboardView() {
  const [byServer, setByServer] = useState([]);
  const [summary, setSummary] = useState({ barotem: null });
  const [history, setHistory] = useState({ barotem: [] });
  const [trades, setTrades] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [selectedServerCode, setSelectedServerCode] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');

  const handleWs = useCallback((msg) => {
    switch (msg.type) {
      case 'summary':
      case 'prices':
        if (msg.payload?.barotem) setSummary((s) => ({ ...s, barotem: msg.payload.barotem }));
        break;
      case 'trades':
        if (msg.payload) setTrades(msg.payload);
        break;
      case 'byServer':
        if (msg.payload?.length) {
          setByServer(msg.payload);
          if (selectedServerCode == null) setSelectedServerCode(msg.payload[0]?.serverCode);
        }
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
    getByServer().then((list) => {
      if (list?.length) {
        setByServer(list);
        if (selectedServerCode == null) setSelectedServerCode(list[0]?.serverCode);
      }
    });
    getSummary().then(setSummary);
    getHistory('barotem').then((res) => setHistory((h) => ({ ...h, barotem: res.data || [] })));
    getTrades(50).then(setTrades);
    getChat(100).then(setChatMessages);
  }, []);

  const serverIndex = byServer.findIndex((s) => Number(s.serverCode) === Number(selectedServerCode));

  return (
    <div className="dashboard-app">
      <header className="dashboard-header">
        <h1 className="dashboard-logo">게임머니 시세</h1>
        <span className="dashboard-badge">{connected ? '실시간 연결됨' : '연결 대기'}</span>
        <a href="#광고문의" className="dashboard-ad">광고문의</a>
        <button
          type="button"
          className="dashboard-parse-btn"
          disabled={parsing}
          onClick={async () => {
            setParsing(true);
            setParseMessage('');
            try {
              const result = await triggerParse();
              const [by, , t, ch] = await Promise.all([getByServer(), getSummary(), getTrades(50), getChat(100)]);
              if (by?.length) setByServer(by);
              setTrades(t || []);
              setChatMessages(ch || []);
              const count = result?.count ?? 0;
              setParseMessage(count > 0 ? `수집 완료 ${count}건` : '0건 수집됨');
            } catch (e) {
              setParseMessage('수집 실패: ' + (e?.message || '서버 연결 확인'));
            } finally {
              setParsing(false);
              setTimeout(() => setParseMessage(''), 6000);
            }
          }}
        >
          {parsing ? '수집 중…' : '지금 수집'}
        </button>
        {parseMessage && (
          <span className={`dashboard-parse-status ${parseMessage.startsWith('수집 실패') ? 'err' : 'ok'}`}>
            {parseMessage}
          </span>
        )}
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-aside">
          <ServerList
            byServer={byServer}
            selectedServerCode={selectedServerCode}
            onSelect={setSelectedServerCode}
          />
        </aside>
        <main className="dashboard-main">
          <ServerChart
            serverCode={selectedServerCode}
            serverIndex={serverIndex}
            serverName={byServer[serverIndex]?.serverName}
            history={history.barotem}
            trades={trades}
          />
          <section className="dashboard-board-section">
            <Board
              messages={chatMessages}
              selectedServerCode={selectedServerCode}
              serverIndex={serverIndex}
            />
          </section>
        </main>
      </div>

      <footer className="dashboard-footer">
        <p className="dashboard-disclaimer">
          시세·거래 데이터는 중계 사이트 기준이며 실제 체결가와 다를 수 있습니다. 투자 판단은 본인 책임입니다.
        </p>
        <p className="dashboard-copy">© 2026</p>
      </footer>
    </div>
  );
}
