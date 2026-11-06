export function parseIdList(val) {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : String(val).split(',');
  return arr
    .map(s => Number(String(s).trim()))
    .filter(Number.isInteger);
}