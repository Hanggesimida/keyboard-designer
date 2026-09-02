"use client"

import * as React from "react"
import { X } from "lucide-react"
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
import { useAdminUsers } from "@/hooks/queries/admin/useAdminUsers"
import type { UserRole, AccountType } from "@/lib/api/admin-users"
import { createUserColumns } from "./columns"

const DEFAULT_PAGE_SIZE = 20

export function UsersTable() {
  const t = useTranslations("Admin.users")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const [page, setPage] = React.useState(1)
  const [roles, setRoles] = React.useState<UserRole[]>([])
  const [accountTypes, setAccountTypes] = React.useState<AccountType[]>([])
  const [searchInput, setSearchInput] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
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

  const roleFilter = roles.length === 1 ? roles[0] : undefined
  const accountTypeFilter = accountTypes.length === 1 ? accountTypes[0] : undefined

  const { data, isLoading, isFetching } = useAdminUsers({
    page,
    limit: DEFAULT_PAGE_SIZE,
    role: roleFilter,
    accountType: accountTypeFilter,
    search: search || undefined,
  })

  const users = data?.items ?? []
  const total = data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

  const columns = React.useMemo(
    () =>
      createUserColumns(
        (message) => setError(message),
        (key, values) => (t as (k: string, v?: Record<string, number>) => string)(key, values),
        dateLocale,
      ),
    [t, dateLocale],
  )

  const roleOptions: FacetedFilterOption[] = React.useMemo(
    () => [
      { value: "ADMIN", label: t("admin") },
      { value: "USER", label: t("regular") },
    ],
    [t],
  )

  const accountTypeOptions: FacetedFilterOption[] = React.useMemo(
    () => [
      { value: "NORMAL", label: t("personal") },
      { value: "ENTERPRISE_MAIN", label: t("enterpriseMain") },
      { value: "ENTERPRISE_SUB", label: t("enterpriseSub") },
    ],
    [t],
  )

  const { table } = useServerDataTable({
    data: users,
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
    const roleColFilter = filters.find((f) => f.id === "role")
    const roleValues = (roleColFilter?.value as string[] | undefined) ?? []
    setRoles(roleValues as UserRole[])
    const accountTypeColFilter = filters.find((f) => f.id === "accountType")
    const accountTypeValues =
      (accountTypeColFilter?.value as string[] | undefined) ?? []
    setAccountTypes(accountTypeValues as AccountType[])
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFiltersKey])

  const isFiltered = tableFilters.length > 0

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button
            type="button"
            className="ml-2 underline-offset-2 hover:underline"
            onClick={() => setError(null)}
          >
            {t("close")}
          </button>
        </div>
      )}
      <DataTable
        table={table}
        columns={columns}
        totalRows={total}
        isLoading={isLoading || isFetching}
        emptyText={t("empty")}
        toolbar={
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("searchEmail")}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 w-[150px] lg:w-[250px] text-sm"
            />
            <DataTableFacetedFilter
              column={table.getColumn("role")}
              title={t("role")}
              options={roleOptions}
            />
            <DataTableFacetedFilter
              column={table.getColumn("accountType")}
              title={t("accountType")}
              options={accountTypeOptions}
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
    </div>
  )
}
