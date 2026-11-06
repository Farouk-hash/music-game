// game/src/components/ui/Pagination.jsx
//
// Prev / page indicators / next. Renders nothing when pageCount <= 1.
// Consumer passes the whole object returned by usePagination().

export function Pagination({ pagination, className = '' }) {
  if (!pagination || pagination.pageCount <= 1) return null;

  const { page, pageCount, hasPrev, hasNext, prev, next, first, last } = pagination;

  // Compact page pills — show at most 5 around the current page.
  const pills = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(pageCount, page + 2);
  if (start > 1) pills.push(1, start > 2 ? '…' : null);
  for (let i = start; i <= end; i++) pills.push(i);
  if (end < pageCount) pills.push(end < pageCount - 1 ? '…' : null, pageCount);

  const btnBase =
    'inline-flex items-center justify-center h-9 min-w-[2.25rem] px-2 rounded-md border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
  const btnIdle =
    'bg-surface-2 text-ink-muted border-border hover:border-accent-2 hover:text-ink';
  const btnActive = 'bg-accent text-bg border-accent';

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-2 flex-wrap ${className} pt-4`}
    >
      <button
        type="button"
        onClick={first}
        disabled={!hasPrev}
        aria-label="First page"
        className={`${btnBase} ${btnIdle}`}
      >
        «
      </button>
      <button
        type="button"
        onClick={prev}
        disabled={!hasPrev}
        aria-label="Previous page"
        className={`${btnBase} ${btnIdle}`}
      >
        ‹
      </button>

      {pills.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="text-ink-subtle text-sm px-1">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => pagination.setPage(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={next}
        disabled={!hasNext}
        aria-label="Next page"
        className={`${btnBase} ${btnIdle}`}
      >
        ›
      </button>
      <button
        type="button"
        onClick={last}
        disabled={!hasNext}
        aria-label="Last page"
        className={`${btnBase} ${btnIdle}`}
      >
        »
      </button>
    </nav>
  );
}