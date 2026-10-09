// src/hooks/usePagination.js
import { useMemo, useState } from 'react';

/**
 * Client-side pagination over an in-memory array.
 *
 *   const pg = usePagination(items, {
 *     perPage: 24,
 *     resetKey: filterSignature,   // optional — resets to page 1 when it changes
 *   });
 *
 *   {pg.pageItems.map(x => <Row key={x.id} {...x} />)}
 *   <Pagination {...pg} />
 *
 * The hook returns props that match `<Pagination>`'s expectations, so
 * `<Pagination {...pg} />` works as a one-liner.
 */
export function usePagination(items = [], {
  perPage = 24,
  initialPage = 1,
  resetKey,
} = {}) {
  const [page, setPageState] = useState(initialPage);
  const [lastReset, setLastReset] = useState(resetKey);

  // Adjust state during render when resetKey changes.
  // This is the React-sanctioned alternative to comparing against a ref.
  if (lastReset !== resetKey) {
    setLastReset(resetKey);
    if (page !== initialPage) setPageState(initialPage);
  }

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, safePage, perPage]);

  function setPage(n) {
    const clamped = Math.min(Math.max(1, Number(n) || 1), totalPages);
    setPageState(clamped);
  }

  return {
    pageItems,
    page: safePage,
    perPage,
    totalItems,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    rangeStart: totalItems === 0 ? 0 : (safePage - 1) * perPage + 1,
    rangeEnd: Math.min(safePage * perPage, totalItems),

    onPage: setPage,
    onPrev: () => setPage(safePage - 1),
    onNext: () => setPage(safePage + 1),

    setPage,
    goToPage: setPage,
    goPrev: () => setPage(safePage - 1),
    goNext: () => setPage(safePage + 1),
  };
}