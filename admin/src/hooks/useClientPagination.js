// src/hooks/useClientPagination.js
import { useState, useMemo, useCallback } from 'react';

/**
 * Client-side pagination over an in-memory array.
 * No fetching — the parent already has the full list.
 *
 *   const { pageItems, page, totalPages, goPrev, goNext, setPage } =
 *     useClientPagination(artists, { perPage: 24 });
 */
export function useClientPagination(items = [], { perPage = 24, initialPage = 1 } = {}) {
  const [rawPage, setRawPage] = useState(initialPage);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  // Clamp during render — no effect, no warning.
  const page = Math.min(Math.max(rawPage, 1), totalPages);

  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, page, perPage]);

  const goPrev = useCallback(() => {
    setRawPage(p => Math.max(1, Math.min(p, totalPages) - 1));
  }, [totalPages]);

  const goNext = useCallback(() => {
    setRawPage(p => Math.min(totalPages, Math.min(p, totalPages) + 1));
  }, [totalPages]);

  const setPage = useCallback((n) => {
    setRawPage(Math.min(Math.max(Number(n) || 1, 1), totalPages));
  }, [totalPages]);

  return {
    page,
    setPage,
    totalPages,
    total,
    perPage,
    pageItems,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    goPrev,
    goNext,
  };
}