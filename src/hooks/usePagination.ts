import { useState, useCallback } from 'react'

export function usePagination(
  totalItems: number,
  defaultPageSize: number = 20,
) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const nextPage = useCallback(() => goToPage(page + 1), [goToPage, page])
  const prevPage = useCallback(() => goToPage(page - 1), [goToPage, page])

  return {
    page,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}
