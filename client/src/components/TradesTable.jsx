import React from 'react';

const sourceNames = { barotem: '바로템' };

export function TradesTable({ trades }) {
  const list = trades || [];

  return (
    <div className="trades-card">
      <div className="trades-title">최근 거래 내역</div>
      <div className="trades-wrap">
        <table className="trades-table">
          <thead>
            <tr>
              <th>사이트</th>
              <th>거래양</th>
              <th>금액</th>
              <th>시간</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="trades-empty">거래 데이터가 없습니다.</td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id}>
                  <td>{sourceNames[t.source] || t.source}</td>
                  <td>{Number(t.quantity).toLocaleString()}</td>
                  <td>{Number(t.price).toLocaleString()}만원</td>
                  <td>{formatTime(t.time)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
