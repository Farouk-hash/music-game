// admin/src/components/domain/Templates/YearSelector.jsx
import { useMemo, useState } from 'react';
import { useAdminCatalog } from '../../../hooks/cloud-flare/Templates/useAdminCatalog';

export function YearSelector({ value, onChange }) {
  // value: null | { type: 'range', values: '1983-2000' } | { type: 'set', values: [1983, 1984, ...] }
  const { years, loading } = useAdminCatalog();
  const [search, setSearch] = useState('');

  const allYears = useMemo(() => {
    return years.map(y => y.year).sort((a, b) => b - a);
  }, [years]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allYears;
    return allYears.filter(y => String(y).includes(search.trim()));
  }, [allYears, search]);

  const mode = value?.type ?? 'any'; // 'any' | 'range' | 'set'

  // For range mode, we keep local state so the user can type 4 digits before committing.
  const initialRange = useMemo(() => {
    if (value?.type === 'range') {
      const m = /^(\d{4})-(\d{4})$/.exec(value.values);
      if (m) return { min: m[1], max: m[2] };
    }
    return { min: '', max: '' };
  }, [value]);

  const [rangeMin, setRangeMin] = useState(initialRange.min);
  const [rangeMax, setRangeMax] = useState(initialRange.max);

  function setMode(next) {
    if (next === 'any') onChange(null);
    if (next === 'range') {
      const lo = rangeMin || (allYears.length ? String(allYears[allYears.length - 1]) : '1900');
      const hi = rangeMax || (allYears.length ? String(allYears[0]) : '2100');
      setRangeMin(lo);
      setRangeMax(hi);
      onChange({ type: 'range', values: `${lo}-${hi}` });
    }
    if (next === 'set') onChange({ type: 'set', values: [] });
  }

  function commitRange() {
    const lo = Number(rangeMin);
    const hi = Number(rangeMax);
    if (!Number.isInteger(lo) || !Number.isInteger(hi)) return;
    if (lo < 1900 || hi > 2100) return;
    if (lo > hi) return;
    onChange({ type: 'range', values: `${lo}-${hi}` });
  }

  const selectedSet = value?.type === 'set' ? new Set(value.values) : new Set();

  function toggleYear(year) {
    const next = new Set(selectedSet);
    if (next.has(year)) next.delete(year);
    else next.add(year);
    if (next.size === 0) onChange(null);
    else onChange({ type: 'set', values: [...next].sort((a, b) => a - b) });
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading years…</p>;

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        {[
          { key: 'any', label: 'Any year' },
          { key: 'range', label: 'Range' },
          { key: 'set', label: 'Specific years' },
        ].map(m => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={[
              'px-3 h-8 rounded-md border text-sm transition-colors',
              mode === m.key
                ? 'bg-brand-500 text-white border-brand-500'
                : 'bg-surface-subtle text-ink-muted border-surface-border hover:border-brand-500',
            ].join(' ')}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Range mode */}
      {mode === 'range' && (
        <div className="flex items-center gap-3 p-3 border border-surface-border rounded-md bg-surface-subtle">
          <label className="space-y-1">
            <span className="text-xs text-ink-muted block">From</span>
            <input
              type="number"
              min={1900}
              max={2100}
              value={rangeMin}
              onChange={e => setRangeMin(e.target.value)}
              onBlur={commitRange}
              className="w-24 h-9 px-2 rounded-md border border-surface-border bg-surface text-sm"
            />
          </label>
          <span className="text-ink-muted mt-4">→</span>
          <label className="space-y-1">
            <span className="text-xs text-ink-muted block">To</span>
            <input
              type="number"
              min={1900}
              max={2100}
              value={rangeMax}
              onChange={e => setRangeMax(e.target.value)}
              onBlur={commitRange}
              className="w-24 h-9 px-2 rounded-md border border-surface-border bg-surface text-sm"
            />
          </label>
          <button
            type="button"
            onClick={commitRange}
            className="self-end h-9 px-3 rounded-md bg-brand-500 text-white text-sm hover:bg-brand-600"
          >
            Apply
          </button>
          <p className="text-xs text-ink-subtle self-end pb-2">
            Current: {value?.type === 'range' ? value.values : '—'}
          </p>
        </div>
      )}

      {/* Set mode (specific years) */}
      {mode === 'set' && (
        <div className="space-y-3 p-3 border border-surface-border rounded-md bg-surface-subtle">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search year (e.g. 1995)…"
              className="h-9 px-3 rounded-md border border-surface-border bg-surface flex-1 max-w-xs text-sm"
            />
            <span className="text-xs text-ink-subtle">{selectedSet.size} selected</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-ink-muted">No years match.</p>
            ) : (
              filtered.map(y => {
                const active = selectedSet.has(y);
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => toggleYear(y)}
                    className={[
                      'px-2.5 h-7 rounded text-xs tabular-nums transition-colors border',
                      active
                        ? 'bg-brand-500 text-white border-brand-500'
                        : 'bg-surface text-ink-muted border-surface-border hover:border-brand-500',
                    ].join(' ')}
                  >
                    {y}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}