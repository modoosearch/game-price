import React from 'react';
import { SERVER_NAMES } from './serverNames';

export function ServerList({ byServer, selectedServerCode, onSelect }) {
  const list = byServer || [];
  const selected = selectedServerCode ?? (list[0]?.serverCode);

  return (
    <div className="dashboard-server-list">
      <div className="dashboard-server-list-title">서버</div>
      <div className="dashboard-server-list-sub">현재가 대비(15시)</div>
      <ul className="dashboard-server-ul">
        {list.length === 0 ? (
          <li className="dashboard-server-li empty">데이터 수집 중...</li>
        ) : (
          list.map((s, i) => {
            const avg = avgPrice(s.items);
            const pct = mockPctChange();
            const name = s.serverName || SERVER_NAMES[i] ?? `서버 ${s.serverCode}`;
            const isSelected = Number(s.serverCode) === Number(selected);
            return (
              <li
                key={s.serverCode}
                className={`dashboard-server-li ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(s.serverCode)}
              >
                <span className="name">{name}</span>
                <span className="price">{avg != null ? Number(avg).toLocaleString() : '-'}</span>
                <span className={`pct ${pct >= 0 ? 'up' : 'down'}`}>
                  {pct >= 0 ? '' : ''}{(pct).toFixed(2)}%
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function avgPrice(items) {
  if (!items?.length) return null;
  const sum = items.reduce((a, i) => a + (i.price || 0), 0);
  return sum / items.length;
}

function mockPctChange() {
  return -(Math.random() * 45 + 3);
}
