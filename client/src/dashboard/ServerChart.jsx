import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SERVER_NAMES } from './serverNames';

export function ServerChart({ serverCode, serverIndex, serverName, history, trades }) {
  const name = (serverName || SERVER_NAMES[serverIndex]) ?? `서버 ${serverCode}`;
  const chartData = (history || []).map((d) => ({
    time: new Date(d.time).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    가격: Math.round((d.avgPrice ?? 0) * 10) / 10
  })).reverse();
  const serverTrades = (trades || []).filter((t) => t.serverCode != null ? Number(t.serverCode) === Number(serverCode) : true);

  return (
    <div className="dashboard-main-top">
      <h2 className="dashboard-main-title">{name} ADENA/W</h2>
      <div className="dashboard-chart-row">
        <div className="dashboard-chart-wrap">
          {chartData.length === 0 ? (
            <div className="dashboard-chart-empty">시세 데이터 수집 중...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} domain={['auto', 'auto']} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip
                  contentStyle={{ background: '#18181c', border: '1px solid #2a2a30', borderRadius: 8 }}
                  formatter={(v) => [v != null ? Number(v).toLocaleString() + '원' : '-', '체결가']}
                />
                <Line type="monotone" dataKey="가격" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="dashboard-trades-wrap">
          <table className="dashboard-trades-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>수량</th>
                <th>체결가</th>
              </tr>
            </thead>
            <tbody>
              {(serverTrades.length ? serverTrades : trades || []).slice(0, 15).map((t, i) => (
                <tr key={t.id || i}>
                  <td>{(t.type === 'M' ? 'M' : 'B')} {formatTime(t.time)}</td>
                  <td>{formatQty(t.quantity)}</td>
                  <td>{t.price != null ? Number(t.price).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!serverTrades.length && !(trades || []).length) && (
            <div className="dashboard-trades-empty">거래 내역 없음</div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatQty(q) {
  if (q == null) return '-';
  const n = Number(q);
  if (n >= 10000) return (n / 10000) + '만';
  return n.toLocaleString();
}
