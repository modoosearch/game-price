import React, { useState, useRef, useEffect } from 'react';
import { sendChat } from '../api';
import { SERVER_NAMES } from './serverNames';

const TABS = [
  { key: 'all', label: '전체게시판' },
  { key: 'server', label: '서버별게시판' },
  { key: 'calc', label: '계산기' }
];

export function Board({ messages, selectedServerCode, serverIndex }) {
  const [tab, setTab] = useState('all');
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [message, setMessage] = useState('');
  const listRef = useRef(null);
  const serverName = SERVER_NAMES[serverIndex] ?? `서버 ${selectedServerCode}`;

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [messages?.length]);

  const filtered = tab === 'server' && selectedServerCode != null
    ? (messages || []).filter((m) => (m.message || '').includes(serverName))
    : (messages || []);

  const handleRegister = () => {
    const text = message.trim();
    if (!text) return;
    sendChat(nick.trim() || '익명', `[${serverName}] ${text}`).then(() => setMessage(''));
  };

  return (
    <div className="dashboard-board">
      <div className="dashboard-board-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`dashboard-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'calc' ? (
        <div className="dashboard-calc">
          <p className="dashboard-calc-desc">환산 계산기</p>
          <div className="dashboard-calc-row">
            <input type="number" placeholder="수량" id="calcQty" className="dashboard-calc-input" />
            <span>×</span>
            <input type="number" placeholder="단가(원)" id="calcPrice" className="dashboard-calc-input" />
            <span>=</span>
            <span id="calcResult">0 원</span>
          </div>
          <button type="button" className="dashboard-calc-btn" onClick={() => {
            const q = Number(document.getElementById('calcQty')?.value) || 0;
            const p = Number(document.getElementById('calcPrice')?.value) || 0;
            const el = document.getElementById('calcResult');
            if (el) el.textContent = (q * p).toLocaleString() + ' 원';
          }}>
            계산
          </button>
        </div>
      ) : (
        <>
          <div className="dashboard-msg-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="dashboard-msg-empty">메시지 없음</div>
            ) : (
              filtered.map((m) => {
                const msg = m.message || '';
                const match = msg.match(/^(\[[^\]]+\])\s*(.*)/);
                const line = match ? `${match[1]} ${m.nick}: ${match[2]}` : `${m.nick}: ${msg}`;
                return (
                  <div key={m.id} className="dashboard-msg">
                    <span className="dashboard-msg-text">{line}</span>
                    <span className="dashboard-msg-time">{formatTime(m.time)}</span>
                  </div>
                );
              })
            )}
          </div>
          <div className="dashboard-board-inputs">
            <input type="text" placeholder="nick" value={nick} onChange={(e) => setNick(e.target.value)} className="dashboard-inp nick" />
            <input type="password" placeholder="pw" value={pw} onChange={(e) => setPw(e.target.value)} className="dashboard-inp pw" />
            <input type="text" placeholder="massage" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRegister()} className="dashboard-inp msg" />
            <button type="button" className="dashboard-register-btn" onClick={handleRegister}>등록</button>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
