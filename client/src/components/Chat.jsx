import React, { useState, useRef, useEffect } from 'react';
import { sendChat } from '../api';

export function Chat({ messages, onSend }) {
  const [nick, setNick] = useState(() => localStorage.getItem('chatNick') || '');
  const [input, setInput] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [messages?.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const n = nick.trim() || '익명';
    localStorage.setItem('chatNick', n);
    sendChat(n, text).then(() => setInput(''));
    onSend?.();
  };

  return (
    <div className="chat-card">
      <div className="chat-title">실시간 채팅</div>
      <div className="chat-messages" ref={listRef}>
        {(messages || []).length === 0 ? (
          <div className="chat-empty">메시지가 없습니다.</div>
        ) : (
          (messages || []).map((m) => (
            <div key={m.id} className="chat-msg">
              <span className="chat-nick">{m.nick}</span>
              <span className="chat-text">{m.message}</span>
              <span className="chat-time">{formatTime(m.time)}</span>
            </div>
          ))
        )}
      </div>
      <div className="chat-input-wrap">
        <input
          type="text"
          placeholder="닉네임"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          className="chat-nick-input"
        />
        <input
          type="text"
          placeholder="메시지 입력..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="chat-msg-input"
        />
        <button type="button" onClick={handleSend} className="chat-send">전송</button>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
