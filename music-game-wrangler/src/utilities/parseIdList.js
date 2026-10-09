
export function parseIdList(str) {
  if (!str) return [];
  return str
    .split(',')
    .map(s => Number(s.trim()))
    .filter(Number.isInteger);
}

