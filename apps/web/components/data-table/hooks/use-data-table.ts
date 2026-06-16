"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

interface UseDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  /** 默认每页行数，默认 10 */
  pageSize?: number
}

/**
 * 客户端模式 hook：筛选、分页均在本地完成。
 * 直接传入完整数据集，适合数据量较小的场景。
 */
export function useDataTable<TData>({
  data,
  columns,
  pageSize = 10,
}: UseDataTableOptions<TData>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    initialState: {
      pagination: { pageSize },
    },
    autoResetPageIndex: false,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return { table }
}
