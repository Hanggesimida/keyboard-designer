"use client"

import * as React from "react"
import {
  useTable,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type RowData,
} from "@tanstack/react-table"

import {
  dataTableFeatures,
  type DataTableColumnDef,
} from "../table-features"

interface UseDataTableOptions<TData extends RowData> {
  data: TData[]
  columns: DataTableColumnDef<TData>[]
  /** 默认每页行数，默认 10 */
  pageSize?: number
}

/**
 * 客户端模式 hook：筛选、分页均在本地完成。
 * 直接传入完整数据集，适合数据量较小的场景。
 */
export function useDataTable<TData extends RowData>({
  data,
  columns,
  pageSize = 10,
}: UseDataTableOptions<TData>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
    autoResetPageIndex: false,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return { table }
}
