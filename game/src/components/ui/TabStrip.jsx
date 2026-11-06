// game/src/components/ui/TabStrip.jsx
//
// Controlled tab strip. Handles layout (grid or wrap), active-state styling,
// and optional count badges. Used by CollectionsModal, ProfileModal, and
// FriendsModal — consolidated so the tab UX can't drift between them.
//
//   <TabStrip
//     tabs={[{ key: 'mine', label: 'My collections', badge: 3 }]}
//     value={tab}
//     onChange={setTab}
//     cols={3}          // used when mode="grid"
//     mode="grid"       // "grid" (equal width) | "wrap" (natural width)
//   />
//
// The strip fills its container's width. Put it inside whatever padding
// wrapper the caller wants; it doesn't add margin.

export function TabStrip({
  tabs,
  value,
  onChange,
  cols = 3,
  mode = 'grid',
  className = '',
}) {
  if (!Array.isArray(tabs) || tabs.length === 0) return null;

  // ── Container class based on mode ─────────────────────
  const containerClass =
    mode === 'grid'
      ? `grid gap-2 ${colsClass(cols)}`
      : 'flex flex-wrap gap-2';

  return (
    <div className={[containerClass, className].filter(Boolean).join(' ')}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            aria-pressed={active}
            className={[
              'px-4 h-10 rounded-md border text-sm font-medium transition-colors',
              'inline-flex items-center justify-center gap-2',
              active
                ? 'bg-accent text-bg border-accent'
                : 'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink',
            ].join(' ')}
          >
            <span className="truncate">{t.label}</span>
            {t.badge != null && t.badge > 0 && (
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-semibold tabular-nums shrink-0',
                  active ? 'bg-bg text-accent' : 'bg-accent text-bg',
                ].join(' ')}
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Tailwind's JIT can't generate dynamic class names, so every column count
// the caller might pass must be enumerated here. Add as needed.
function colsClass(cols) {
  switch (cols) {
    case 2: return 'grid-cols-2';
    case 3: return 'grid-cols-3';
    case 4: return 'grid-cols-2 sm:grid-cols-4';
    case 5: return 'grid-cols-2 sm:grid-cols-5';
    default: return 'grid-cols-3';
  }
}