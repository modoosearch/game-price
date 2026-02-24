import React from 'react';

const sourceNames = { barotem: '바로템' };

export function SummaryCard({ source, data }) {
  if (!data) return null;
  const name = sourceNames[source] || source;
  const change = data.changePercent;
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  return (
    <div className="summary-card">
      <div className="summary-title">{name}</div>
      <div className="summary-price">
        평균 <strong>{formatPrice(data.avgPrice)}</strong> 원
      </div>
      <div className="summary-meta">
        거래건수 {data.count} · 거래량 {formatNum(data.totalQuantity)} · 총액 {formatPrice(data.totalAmount / 10000)}만원
      </div>
      {change != null && (
        <div className={`summary-change ${isUp ? 'up' : isDown ? 'down' : ''}`}>
          {isUp && '▲'} {isDown && '▼'} {formatPercent(change)}
        </div>
      )}
    </div>
  );
}

function formatPrice(v) {
  if (v == null) return '-';
  return Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
}
function formatNum(v) {
  if (v == null) return '-';
  return Number(v).toLocaleString('ko-KR');
}
function formatPercent(v) {
  if (v == null) return '';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${Number(v).toFixed(2)}%`;
}
