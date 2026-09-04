"use client"

import { type RowData } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { type DataTableInstance } from "./table-features"

interface DataTablePaginationProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /**
   * 服务端模式下的总条数。
   * 传入时左侧将显示"共 N 条"；不传则显示已选/当前页行数统计。
   */
  totalRows?: number
  /** 每页行数选项，默认 [10, 20, 30, 50] */
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData extends RowData>({
  table,
  totalRows,
  pageSizeOptions = [10, 20, 30, 50],
}: DataTablePaginationProps<TData>) {
  const t = useTranslations("DataTable")
  const { pageIndex, pageSize } = table.state.pagination

  const selectedCount = table.getFilteredSelectedRowModel().rows.length
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
      {/* 统计信息：移动端显示在顶部居中，桌面端靠左 */}
      <div className="text-center text-sm text-muted-foreground sm:flex-1 sm:text-left">
        {totalRows !== undefined ? (
          <span>{t("total", { count: totalRows })}</span>
        ) : (
          <span>
            {t("selectedOf", { selected: selectedCount, total: filteredCount })}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:flex-nowrap sm:space-x-6 lg:space-x-8">
        {/* 每页行数：移动端隐藏文字标签，仅显示 Select */}
        <div className="flex items-center space-x-2">
          <p className="hidden text-sm font-medium whitespace-nowrap sm:block">{t("rowsPerPage")}</p>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 页码信息 */}
        <div className="flex min-w-[80px] items-center justify-center text-sm font-medium">
          {t("page", { page: pageIndex + 1, total: table.getPageCount() })}
        </div>

        {/* 翻页按钮 */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("firstPage")}</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">{t("prevPage")}</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t("nextPage")}</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">{t("lastPage")}</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
