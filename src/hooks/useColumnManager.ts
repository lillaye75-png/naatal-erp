"use client"

import { useState, useMemo, useCallback } from "react"

export interface ColumnDef {
  id: string
  label: string
  visible?: boolean
  filterable?: boolean
}

export function useColumnManager(columns: ColumnDef[]) {
  const initialVisible = useMemo(
    () => new Set(columns.filter((c) => c.visible !== false).map((c) => c.id)),
    [columns],
  )

  const [visible, setVisible] = useState<Set<string>>(initialVisible)
  const [filters, setFilters] = useState<Record<string, string>>({})

  const toggleColumn = useCallback((colId: string) => {
    setVisible((prev) => {
      const next = new Set(prev)
      if (next.has(colId)) next.delete(colId)
      else next.add(colId)
      return next
    })
  }, [])

  const setFilter = useCallback((colId: string, value: string) => {
    setFilters((prev) => ({ ...prev, [colId]: value }))
  }, [])

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible.has(c.id)),
    [columns, visible],
  )

  const resetVisibility = useCallback(() => setVisible(initialVisible), [initialVisible])
  const resetFilters = useCallback(() => setFilters({}), [])

  return {
    visible,
    visibleColumns,
    filters,
    toggleColumn,
    setFilter,
    resetVisibility,
    resetFilters,
  }
}
