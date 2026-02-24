/** 배포 시 API 주소. 같은 서버에 올리면 비워두고, 프론트만 다른 호스트면 VITE_API_BASE=https://노드서버주소 로 빌드 */
const API_BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE ?? '');

export async function getSummary() {
  const r = await fetch(`${API_BASE}/api/summary`);
  return r.json();
}

export async function getHistory(source = 'barotem') {
  const r = await fetch(`${API_BASE}/api/history?source=${source}`);
  return r.json();
}

export async function getTrades(limit = 50) {
  const r = await fetch(`${API_BASE}/api/trades?limit=${limit}`);
  return r.json();
}

export async function getByServer() {
  const r = await fetch(`${API_BASE}/api/barotem/by-server`);
  return r.json();
}

export async function getChat(limit = 100) {
  const r = await fetch(`${API_BASE}/api/chat?limit=${limit}`);
  return r.json();
}

export async function sendChat(nick, message) {
  const r = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nick, message })
  });
  return r.json();
}

export async function triggerParse() {
  const r = await fetch(`${API_BASE}/api/parse/barotem`, { method: 'POST' });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || '서버 오류 ' + r.status);
  return data;
}

export function getWsUrl() {
  if (import.meta.env.DEV) {
    const base = window.location.port === '3000' ? 'ws://localhost:4000' : window.location.origin.replace(/^http/, 'ws');
    return `${base}/ws`;
  }
  const base = import.meta.env.VITE_API_BASE ?? '';
  return base.replace(/^http/, 'ws') + '/ws';
}
