// src/lib/format.js

export function formatDuration(ms) {
  if (!ms) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function formatNumber(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://www.matb3aa.com/${encodeURI(path)}`;
}