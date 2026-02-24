import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const sourceNames = { barotem: '바로템' };

export function PriceChart({ source, data }) {
  const name = sourceNames[source] || source;
  const list = (data || []).map((d) => ({
    time: new Date(d.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    가격: Math.round(d.avgPrice * 10) / 10,
    거래량: d.totalQuantity,
    거래건수: d.count
  })).reverse();

  if (list.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-title">{name} 시세</div>
        <div className="chart-empty">데이터 수집 중...</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-title">{name} 시세 (1분 단위)</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={list} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
          <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => v.toLocaleString()} />
          <Tooltip
            contentStyle={{ background: '#18181c', border: '1px solid #2a2a30', borderRadius: 8 }}
            labelStyle={{ color: '#a78bfa' }}
            formatter={(value) => [value != null ? value.toLocaleString() : '-', '평균가(원)']}
            labelFormatter={(_, payload) => {
              const p = payload[0]?.payload;
              return p ? `거래 ${p.거래건수}건 · 거래량 ${Number(p.거래량).toLocaleString()}` : '';
            }}
          />
          <Line type="monotone" dataKey="가격" stroke="#a78bfa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
