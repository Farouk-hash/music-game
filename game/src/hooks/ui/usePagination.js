// game/src/hooks/ui/usePagination.js
//
// Client-side pagination. Accepts the full array and returns the visible
// slice plus navigation. When the caller later switches to server-side
// pagination, only the caller changes — this hook's consumer API stays
// the same (items, pageSize) as long as the caller passes one page of
// items and sets `pageCount` via the `total` override.
//
//   const p = usePagination(collections, { pageSize: 8 });
//   p.items        // current page
//   p.page         // 1-based
//   p.pageCount    // number of pages
//   p.setPage(n)
//   p.next(), p.prev(), p.first(), p.last()
//   p.hasPrev, p.hasNext

import { useState, useMemo, useEffect } from 'react';

export function usePagination(items, { pageSize = 8, resetKey } = {}) {
  const [page, setPage] = useState(1);

  const list = Array.isArray(items) ? items : [];
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));

  // Reset when the source changes (e.g. filter change, refetch).
  useEffect(() => {
    setPage(1);
  }, [resetKey, list.length]);

  // Clamp — if the caller's array shrinks, don't land on page 5 of 2.
  const safePage = Math.min(Math.max(1, page), pageCount);
  useEffect(() => {
    if (safePage !== page) setPage(safePage);
  }, [safePage, page]);

  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, safePage, pageSize]);

  return {
    items: visible,
    page: safePage,
    pageCount,
    pageSize,
    total: list.length,
    setPage,
    next: () => setPage((p) => Math.min(pageCount, p + 1)),
    prev: () => setPage((p) => Math.max(1, p - 1)),
    first: () => setPage(1),
    last: () => setPage(pageCount),
    hasPrev: safePage > 1,
    hasNext: safePage < pageCount,
  };
}