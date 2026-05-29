import { useState, useMemo } from "react";

export function usePagination<T>(items: T[], defaultPageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex: Math.min(endIndex, items.length),
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize),
      currentPage,
    };
  }, [items, currentPage, pageSize]);

  const goToPage = (page: number) => {
    const maxPage = Math.ceil(items.length / pageSize);
    setCurrentPage(Math.max(1, Math.min(page, maxPage)));
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const prevPage = () => {
    goToPage(currentPage - 1);
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  const changePageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    ...paginatedData,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    changePageSize,
    canNextPage: currentPage < paginatedData.totalPages,
    canPrevPage: currentPage > 1,
  };
}
