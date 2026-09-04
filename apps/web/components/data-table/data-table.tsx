"use client"

import * as React from "react"
import { type RowData } from "@tanstack/react-table"

import { DataTableCore } from "./data-table-core"
import { DataTablePagination } from "./data-table-pagination"
import {
  type DataTableColumnDef,
  type DataTableInstance,
  type DataTableRow,
} from "./table-features"

interface DataTableProps<TData extends RowData> {
  /** TanStack Table 实例，由 useDataTable / useServerDataTable 创建 */
  table: DataTableInstance<TData>
  /** 列定义，用于计算 colSpan */
  columns: DataTableColumnDef<TData>[]
  /**
   * 工具栏插槽，通常传入 <DataTableToolbar> 或自定义工具栏。
   * 不传则不渲染工具栏区域。
   */
  toolbar?: React.ReactNode
  /**
   * 服务端模式下的总条数，传入后分页组件显示"共 N 条"。
   * 客户端模式不传即可。
   */
  totalRows?: number
  /** 加载状态，为 true 时表格主体显示骨架屏 */
  isLoading?: boolean
  emptyText?: string
  /** 每页行数选项，透传给 DataTablePagination */
  pageSizeOptions?: number[]
  /** 行点击回调，透传给 DataTableCore */
  onRowClick?: (row: DataTableRow<TData>) => void
}

/**
 * 通用 DataTable 主组件：组合工具栏、表格核心、分页控件。
 *
 * 它自身不持有任何状态，所有行为均由外部 hook（useDataTable / useServerDataTable）
 * 创建的 table 实例驱动。
 *
 * @example 客户端模式
 * ```tsx
 * const { table } = useDataTable({ data, columns })
 * <DataTable
 *   table={table}
 *   columns={columns}
 *   toolbar={
 *     <DataTableToolbar table={table} searchColumn="email">
 *       <DataTableFacetedFilter column={table.getColumn("status")} ... />
 *     </DataTableToolbar>
 *   }
 * />
 * ```
 *
 * @example 服务端模式
 * ```tsx
 * const { table, queryState } = useServerDataTable({ data, columns, pageCount })
 * <DataTable table={table} columns={columns} totalRows={totalRows} isLoading={isFetching} toolbar={...} />
 * ```
 */
export function DataTable<TData extends RowData>({
  table,
  columns,
  toolbar,
  totalRows,
  isLoading = false,
  emptyText,
  pageSizeOptions,
  onRowClick,
}: DataTableProps<TData>) {
  return (
    <div className="space-y-3">
      {toolbar && <div>{toolbar}</div>}

      <DataTableCore
        table={table}
        columnCount={columns.length}
        isLoading={isLoading}
        emptyText={emptyText}
        onRowClick={onRowClick}
      />

      <DataTablePagination
        table={table}
        totalRows={totalRows}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  )
}
