"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table"

interface UseServerDataTableOptions<TData> {
  data: TData[]
  columns: ColumnDef<TData, any>[]
  /** 来自后端的总页数 */
  pageCount: number
  /** 默认每页行数，默认 10 */
  defaultPageSize?: number
}

/**
 * 服务端分页 hook（纯本地 state 驱动，无 URL 同步）
 * - 分页/筛选状态通过回调暴露给调用方，供其传入 React Query queryKey
 * - 调用方负责将新数据（data）和新页数（pageCount）传回
 */
export function useServerDataTable<TData>({
  data,
  columns,
  pageCount,
  defaultPageSize = 10,
}: UseServerDataTableOptions<TData>) {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      pagination,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return { table }
}
