/**
 * Reusable hook for server-side table pagination
 * Manages page and page size state with reset functionality
 */

'use client';

import { useState, useCallback } from 'react';

interface UseTablePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export function useTablePagination({
  initialPage = 1,
  initialPageSize = 10,
}: UseTablePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  }, []);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  const goToFirstPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    resetPagination,
    goToFirstPage,
  };
}
