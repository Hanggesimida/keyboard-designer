"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import type { Row } from "@tanstack/react-table"
import {
  DataTable,
  DataTableFacetedFilter,
  useServerDataTable,
  type FacetedFilterOption,
} from "@/components/data-table"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { useAdminOrders } from "@/hooks/queries/admin/useAdminOrders"
import { ORDER_STATUS_CONFIG } from "@/modules/orders"
import type { OrderStatus } from "@/lib/api/orders"
import type { AdminOrderSummary } from "@/lib/api/admin-orders"
import { columns } from "./columns"

const DEFAULT_PAGE_SIZE = 20

const statusOptions: FacetedFilterOption[] = Object.entries(
  ORDER_STATUS_CONFIG,
).map(([value, { label, icon }]) => ({ value, label, icon }))

export function OrdersTable() {
  const router = useRouter()

  // ── 本地分页 & 筛选状态 ───────────────────────────────────────────────────
  const [page, setPage] = React.useState(1)
  const [statuses, setStatuses] = React.useState<OrderStatus[]>([])
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const debounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = React.useCallback((value: string) => {
    setSearchInput(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }, [])

  React.useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  // ── API 请求 ──────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useAdminOrders({
    page,
    limit: DEFAULT_PAGE_SIZE,
    status: statuses.length ? statuses : undefined,
    search: search || undefined,
  })

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

  const { table } = useServerDataTable({
    data: orders,
    columns,
    pageCount,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  // 将表格分页状态同步到本地 page state
  const tablePageIndex = table.getState().pagination.pageIndex
  const isFirstRender = React.useRef(true)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(tablePageIndex + 1)
  }, [tablePageIndex])

  // 将表格列筛选中的 status 同步到本地 statuses state
  // 用 JSON.stringify 序列化作为依赖，避免数组引用每次渲染都变化导致无限触发
  const tableFilters = table.getState().columnFilters
  const tableFiltersKey = JSON.stringify(tableFilters)
  React.useEffect(() => {
    const filters: typeof tableFilters = JSON.parse(tableFiltersKey)
    const statusFilter = filters.find((f) => f.id === "status")
    const values = (statusFilter?.value as string[] | undefined) ?? []
    setStatuses(values as OrderStatus[])
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFiltersKey])

  const isFiltered = tableFilters.length > 0

  const handleRowClick = React.useCallback(
    (row: Row<AdminOrderSummary>) => {
      router.push(`/admin/orders/${row.original.id}`)
    },
    [router],
  )

  return (
    <DataTable
      table={table}
      columns={columns}
      totalRows={total}
      isLoading={isLoading || isFetching}
      emptyText="暂无订单数据"
      onRowClick={handleRowClick}
      toolbar={
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索订单号…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 w-[150px] lg:w-[250px] text-sm"
          />
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title="状态"
            options={statusOptions}
          />
          {(isFiltered || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                table.resetColumnFilters()
                setSearch("")
                setSearchInput("")
                setPage(1)
              }}
              className="h-8 px-2 lg:px-3"
            >
              重置
              <X className="ml-1 size-4" />
            </Button>
          )}
        </div>
      }
    />
  )
}
