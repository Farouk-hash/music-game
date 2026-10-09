import { normalize } from "./normalize";


export function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const k = normalize(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}
