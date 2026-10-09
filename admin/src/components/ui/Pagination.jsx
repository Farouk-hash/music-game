import { Button } from './Button';

/**
 * Pagination bar. Purely presentational — receives all state as props.
 *
 *   <Pagination
 *     page={page}
 *     totalPages={totalPages}
 *     hasPrev={hasPrev}
 *     hasNext={hasNext}
 *     onPrev={goPrev}
 *     onNext={goNext}
 *     onPage={setPage}
 *   />
 *
 * Pass `totalPages={null}` when the total is unknown (server-driven
 * infinite pagination). The component falls back to prev/next buttons only.
 *
 * The bar renders, left-to-right in the DOM (right-to-left visually in RTL):
 *   [First] [Prev] 1 2 [3] 4 5 … 12 [Next] [Last]
 */
export function Pagination({
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onPage,
  maxButtons = 5,
  className = '',
}) {
  // Nothing to show if there's only one page and we know it
  if (totalPages === 1) return null;

  // Also hide if there's no way to navigate
  if (!hasPrev && !hasNext) return null;

  const pages = totalPages
    ? getVisiblePages(page, totalPages, maxButtons)
    : null;

  const showJumpButtons = typeof totalPages === 'number' && totalPages > 1;

  return (
    <nav
      className={`flex items-center justify-center gap-2 ${className}`}
      aria-label="Pagination"
    >
      {/* ── In RTL: rightmost. In LTR: leftmost. ── */}
      {showJumpButtons && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(1)}
          disabled={page === 1}
          aria-label="First page"
          title="First page"
        >
          <span aria-hidden="true">⇥</span>
        </Button>
      )}

      {/* Previous (single step) */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous page"
        title="Previous page"
      >
        <span aria-hidden="true">→</span>
      </Button>

      {/* Page numbers / ellipsis / fallback text */}
      {pages ? (
        pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={`e-${idx}`}
              className="px-2 text-ink-subtle select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className="min-w-8"
            >
              {p}
            </Button>
          )
        )
      ) : (
        <span className="text-sm text-ink-muted px-4">
          Page {page}
        </span>
      )}

      {/* Next (single step) */}
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next page"
        title="Next page"
      >
        <span aria-hidden="true">←</span>
      </Button>

      {/* ── Last page ── */}
      {showJumpButtons && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <span aria-hidden="true">⇤</span>
        </Button>
      )}
    </nav>
  );
}

/**
 * Which page numbers to display, with ellipsis when there are many.
 * Examples (maxButtons=5):
 *   1..3         → [1, 2, 3]
 *   1..12, p=1   → [1, 2, 3, 4, 5, 'ellipsis', 12]
 *   1..12, p=6   → [1, 'ellipsis', 5, 6, 7, 'ellipsis', 12]
 *   1..12, p=12  → [1, 'ellipsis', 8, 9, 10, 11, 12]
 */
function getVisiblePages(current, total, maxButtons) {
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = start + maxButtons - 1;

  if (end > total) {
    end = total;
    start = end - maxButtons + 1;
  }

  const pages = [];

  // Left edge
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }

  // Middle window
  for (let i = start; i <= end; i++) pages.push(i);

  // Right edge
  if (end < total) {
    if (end < total - 1) pages.push('ellipsis');
    pages.push(total);
  }

  return pages;
}