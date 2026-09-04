"use client"

import * as React from "react"
import {
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
} from "@tanstack/react-table"

import {
  dataTableFeatures,
  type DataTableColumnDef,
} from "../table-features"

interface UseServerDataTableOptions<TData extends RowData> {
  data: TData[]
  columns: DataTableColumnDef<TData>[]
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
export function useServerDataTable<TData extends RowData>({
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
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    pageCount,
    manualPagination: true,
    manualFiltering: true,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      pagination,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return { table }
}
