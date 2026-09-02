"use client"

import * as React from "react"
import { X } from "lucide-react"
import type { Row } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { enUS, zhCN } from "date-fns/locale"
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
import { useRouter } from "@/i18n/navigation"
import { createOrderColumns } from "./columns"

const DEFAULT_PAGE_SIZE = 20

export function OrdersTable() {
  const t = useTranslations("Admin.orders")
  const tStatus = useTranslations("OrderStatus")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const router = useRouter()

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

  const { data, isLoading, isFetching } = useAdminOrders({
    page,
    limit: DEFAULT_PAGE_SIZE,
    status: statuses.length ? statuses : undefined,
    search: search || undefined,
  })

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

  const columns = React.useMemo(
    () => createOrderColumns((key, values) => (t as (k: string, v?: Record<string, number>) => string)(key, values), dateLocale),
    [t, dateLocale],
  )

  const statusOptions: FacetedFilterOption[] = React.useMemo(
    () =>
      Object.entries(ORDER_STATUS_CONFIG).map(([value, { icon }]) => ({
        value,
        label: tStatus(value as keyof typeof ORDER_STATUS_CONFIG),
        icon,
      })),
    [tStatus],
  )

  const { table } = useServerDataTable({
    data: orders,
    columns,
    pageCount,
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const tablePageIndex = table.getState().pagination.pageIndex
  const isFirstRender = React.useRef(true)
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setPage(tablePageIndex + 1)
  }, [tablePageIndex])

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
      emptyText={t("empty")}
      onRowClick={handleRowClick}
      toolbar={
        <div className="flex items-center gap-2">
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-8 w-[150px] lg:w-[250px] text-sm"
          />
          <DataTableFacetedFilter
            column={table.getColumn("status")}
            title={t("status")}
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
              {t("reset")}
              <X className="ml-1 size-4" />
            </Button>
          )}
        </div>
      }
    />
  )
}
