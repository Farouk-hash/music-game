// useArtistSearch.js
import { useState } from "react";
import { useServerPagination } from './useServerPagination';

export function useArtistSearch({ perPage = 100 } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.length > 0;

  const basePath = isSearching ? '/search' : '/artists';
  const extraParams = isSearching
    ? { q: searchQuery, type: 'artists' }
    : { orderBy: 'created_at', orderDir: 'desc', withTotal: '1' };

  const p = useServerPagination(basePath, {
    perPage,
    itemsKey: 'artists',
    extraParams,
    pageParam: isSearching ? null : 'page',   // ← matb3aa uses ?page=N
  });

  return {
    searchQuery,
    setSearchQuery,
    isSearching,
    artists: p.items,
    totalPages: p.totalPages,
    totalItems: p.totalItems,
    page: p.page,
    hasPrev: p.hasPrev,
    hasNext: p.hasNext,
    loading: p.loading,
    refreshing: p.refreshing,
    error: p.error,
    setPage: p.setPage,
    goPrev: p.goPrev,
    goNext: p.goNext,
  };
}