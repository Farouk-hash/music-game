// game/src/hooks/ui/useSmartPagination.js
import { useState } from 'react';
import { usePagination } from './usePagination.js';

/**
 * Wraps usePagination and tracks the direction of pagination.
 * Returns 'left' (forward) or 'right' (backward), which can be passed 
 * to the `Reveal` component for smart slide animations.
 * 
 *   const { pagination, direction } = useSmartPagination(genres, { pageSize });
 *   <Reveal key={pagination.page} direction={direction}>...</Reveal>
 *   <Pagination pagination={pagination} />
 */
export function useSmartPagination(items, options) {
  const pagination = usePagination(items, options);
  const [direction, setDirection] = useState('auto');

  const handlePageChange = (newPage) => {
    if (newPage > pagination.page) {
      setDirection('left');  // Moving forward slides in from right
    } else if (newPage < pagination.page) {
      setDirection('right'); // Moving backward slides in from left
    }
    pagination.setPage(newPage);
  };

  return {
    pagination: {
      ...pagination,
      setPage: handlePageChange, // Override setPage to track direction
    },
    direction,
  };
}