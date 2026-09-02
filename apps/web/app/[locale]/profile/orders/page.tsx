"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ShoppingBag, ChevronRight, Loader2, Search, ChevronLeft, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { ProfileSection, ProfileEmptyState } from "@/modules/profile"
import { PageHeader } from "@/components/layouts/PageHeader"
import { OrderStatusBadge } from "@/modules/orders"
import { useMyOrders, useCancelOrder } from "@/hooks/queries/orders/useOrders"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import type { OrderStatus } from "@/lib/api/orders"
import { useRouter } from "@/i18n/navigation"
import { resolveErrorMessage } from "@/lib/api/request"

const STATUS_TAB_VALUES: (OrderStatus | undefined)[] = [
  undefined,
  "PENDING",
  "PAID",
  "CANCELLED",
]

const PAGE_SIZE = 10

export default function ProfileOrdersPage() {
  const t = useTranslations("Profile.orders")
  const tHome = useTranslations("Profile.home")
  const tStatus = useTranslations("OrderStatus")
  const tErrors = useTranslations("Errors")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useMyOrders({
    status: statusFilter,
    search: search || undefined,
    page,
    limit: PAGE_SIZE,
  })
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelOrder()

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleSearchInputChange = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 400)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  const handleStatusFilter = (value: OrderStatus | undefined) => {
    setStatusFilter(value)
    setPage(1)
  }

  function handleConfirmCancel() {
    if (!cancelTargetId) return
    setCancelError(null)
    cancelOrder(cancelTargetId, {
      onSuccess: () => setCancelTargetId(null),
      onError: (err) =>
        setCancelError(resolveErrorMessage(err, t("cancelFailed"), tErrors("sessionExpired"))),
    })
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <ProfileSection>
        {/* 筛选工具栏 */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* 状态筛选 Tab */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            {STATUS_TAB_VALUES.map((value) => {
              const isActive = statusFilter === value
              return (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => handleStatusFilter(value)}
                  className={[
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-muted/60 text-foreground/80"
                      : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40",
                  ].join(" ")}
                >
                  {value ? tStatus(value) : t("all")}
                </button>
              )
            })}
          </div>

          {/* 搜索框 */}
          <div className="relative flex items-center shrink-0">
            <Search size={14} className="absolute left-3 text-muted-foreground/55 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full sm:w-52 rounded-lg border border-border bg-muted/40 pl-8 pr-8 py-1.5 text-xs text-foreground/70 placeholder:text-muted-foreground/45 focus:outline-none focus:border-ring focus:bg-muted/50 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1) }}
                className="absolute right-2.5 text-muted-foreground/45 hover:text-muted-foreground transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 统计 */}
        {!isLoading && (
          <p className="mb-3 text-xs text-muted-foreground/55">{t("total", { count: total })}</p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <ProfileEmptyState
            icon={ShoppingBag}
            title={t("empty")}
            description={tHome("emptyHint")}
            action={{ label: t("start"), href: "/design" }}
          />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-muted/30 hover:bg-muted/35 transition-colors"
              >
                {/* 订单头部 */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/55 font-mono">{order.orderNo}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-[11px] text-muted-foreground/45">
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>

                {/* 订单内容 */}
                <div className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground/80 truncate">
                      {order.design.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {order.addressSnapshot.name} · {order.addressSnapshot.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <p className="text-sm font-semibold text-foreground/80">
                      ¥{parseFloat(order.totalAmount).toFixed(2)}
                    </p>

                    {/* 操作 */}
                    <div className="flex items-center gap-2">
                      {order.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => setCancelTargetId(order.id)}
                          className="text-[11px] text-muted-foreground/55 hover:text-destructive/70 transition-colors cursor-pointer"
                        >
                          {t("cancel")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/profile/orders/${order.id}`)}
                        className="flex items-center gap-0.5 text-[11px] text-muted-foreground/60 hover:text-foreground/70 transition-colors cursor-pointer"
                      >
                        {t("detail")}
                        <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground/55">
              {t("page", { page, total: totalPages })}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-border text-muted-foreground/70 hover:text-foreground/70 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center justify-center w-7 h-7 rounded-md border border-border text-muted-foreground/70 hover:text-foreground/70 hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </ProfileSection>

      {/* 取消确认弹窗 */}
      <AlertDialog
        open={!!cancelTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTargetId(null)
            setCancelError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {cancelError && (
            <p className="text-xs text-destructive/80 px-1">{cancelError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("back")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isCancelling}
              onClick={handleConfirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <><Loader2 size={13} className="animate-spin" /> {t("cancelling")}</>
              ) : (
                t("confirmCancel")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
