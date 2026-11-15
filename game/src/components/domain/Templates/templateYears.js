// game/src/lib/templateYears.js

/**
 * Normalize a template's `years` column into a flat number[] suitable
 * for the /game/round* payload.
 *
 * Supported shapes (from the `templates` table):
 *   null                                          → []
 *   [2010, 2011, ...]                             → as-is
 *   { type: 'range', values: '1983-2000' }        → [1983..2000]
 *   { type: 'set',   values: [2017, 2020, 2024] } → as-is
 *   { "2010": [...artistIds], ... }               → [2010, ...]
 */
export function parseYears(years) { 
  if (years == null) return [];

  if (Array.isArray(years)) {
    return years.map(Number).filter(Number.isFinite);
  }

  if (typeof years !== 'object') return [];

  const { type, values } = years;

  if (type === 'range' && typeof values === 'string') {
    const [fromStr, toStr] = values.split('-');
    const from = Number(fromStr);
    const to   = Number(toStr);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return [];
    const out = [];
    for (let y = from; y <= to; y++) out.push(y);
    return out;
  }

  if (type === 'set' && Array.isArray(values)) {
    return values.map(Number).filter(Number.isFinite);
  }

  // Legacy object-map shape
  return Object.keys(years).map(Number).filter(Number.isFinite);
}

/**
 * Human-readable label for a template's `years` column.
 * Returns null when the template has no years selected.
 */
export function formatYears(years) {
  const list = parseYears(years);
  if (list.length === 0) return null;

  const min = Math.min(...list);
  const max = Math.max(...list);

  if (max - min + 1 === list.length && list.length >= 4) {
    return min === max ? String(min) : `${min}–${max}`;
  }

  if (list.length <= 6) {
    return [...list].sort((a, b) => a - b).join(' · ');
  }

  return `${min}–${max} (${list.length} years)`;
}