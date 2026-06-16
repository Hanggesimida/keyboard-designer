"use client"

import { flexRender, type Table } from "@tanstack/react-table"

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Spinner } from "@workspace/ui/components/spinner"

interface DataTableCoreProps<TData> {
  table: Table<TData>
  /** 列数，用于空状态 colSpan */
  columnCount: number
  /** 加载中时显示 spinner */
  isLoading?: boolean
  /** 空数据提示文案 */
  emptyText?: string
  /** 行点击回调，传入后整行可点击 */
  onRowClick?: (row: import("@tanstack/react-table").Row<TData>) => void
}

/**
 * 纯渲染组件，只负责 thead / tbody 的渲染，不持有任何状态。
 * 接收 table 实例，适用于客户端和服务端两种模式。
 */
export function DataTableCore<TData>({
  table,
  columnCount,
  isLoading = false,
  emptyText = "暂无数据",
  onRowClick,
}: DataTableCoreProps<TData>) {
  return (
    <div className="overflow-hidden rounded-md border">
      <UITable>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                <Spinner className="mx-auto size-5 text-muted-foreground" />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </UITable>
    </div>
  )
}
