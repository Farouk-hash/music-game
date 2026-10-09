// src/hooks/useServerPagination.js
import { useReducer, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

/**
 * Server-driven pagination against a route that uses either
 *   - ?limit=N&offset=N         (default), or
 *   - ?limit=N&page=N           (set `pageParam: 'page'`)
 *
 * Handles both response shapes:
 *   A. Flat:   { <itemsKey>: [...], total: N, count: M }
 *   B. Nested: { pagination: { data: [...], total: N, per_page, last_page } }
 */
export function useServerPagination(basePath, {
  perPage = 30,
  itemsKey = 'data',
  extraParams = {},
  initialPage = 1,
  pageParam = null,        // set to 'page' for matb3aa/Laravel-style APIs
} = {}) {
  const [page, dispatchPage] = useReducer((_, n) => n, initialPage);
  const setPage = useCallback((n) => dispatchPage(Math.max(1, Number(n) || 1)), []);

  const extraKey = JSON.stringify(extraParams);
  const offset = (page - 1) * perPage;

  const path = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', String(perPage));

    if (pageParam) {
      params.set(pageParam, String(page));       // ?page=5
    } else {
      params.set('offset', String(offset));      // ?offset=400
    }

    for (const [k, v] of Object.entries(extraParams)) {
      if (v === null || v === undefined || v === '') continue;
      params.set(k, String(v));
    }

    return `${basePath}?${params.toString()}`;
  }, [basePath, perPage, offset, page, pageParam, extraKey]);   // eslint-disable-line

  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['paginated', basePath, page, perPage, extraKey],
    queryFn: () => api.get(path),
    placeholderData: (prev) => prev,
  });

  const items =
    data?.pagination?.data
    ?? data?.[itemsKey]
    ?? data?.data
    ?? [];

  const totalItems =
    data?.pagination?.total
    ?? data?.total
    ?? (typeof data?.count === 'number' ? data.count : null);

  const totalPages = (() => {
    if (typeof totalItems !== 'number' || totalItems <= 0) return null;
    return Math.max(1, Math.ceil(totalItems / perPage));
  })();

  const hasPrev = page > 1;
  const hasNext = totalPages != null
    ? page < totalPages
    : items.length === perPage;

  return {
    items,
    page,
    perPage,
    totalPages,
    totalItems,
    hasPrev,
    hasNext,
    loading: isLoading,
    refreshing: isFetching && !isLoading,
    error,
    setPage,
    goPrev: () => setPage(Math.max(1, page - 1)),
    goNext: () => setPage(page + 1),
  };
}