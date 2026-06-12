"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  MoreHorizontal,
  ExternalLink,
  FileJson,
  ImageIcon,
  FileCode2,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { useAdminOrders } from "@/hooks/queries/admin/useAdminOrders"
import { OrderStatusBadge, ORDER_STATUS_CONFIG } from "@/modules/admin/components/OrderStatusBadge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group"
import type { OrderStatus } from "@/lib/api/orders"
import type { AdminOrderSummary } from "@/lib/api/admin-orders"

// ─── 状态筛选 Tab ─────────────────────────────────────────────────────────────

const STATUS_TABS: { value: OrderStatus | undefined; label: string }[] = [
  { value: undefined, label: "全部" },
  { value: "PAID", label: "待接单" },
  { value: "APPROVED", label: "已接单" },
  { value: "PROCESSING", label: "生产中" },
  { value: "SHIPPING", label: "运输中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "REFUNDING", label: "退款中" },
  { value: "REFUNDED", label: "已退款" },
]

// ─── 操作菜单 ─────────────────────────────────────────────────────────────────

function OrderActionsMenu({ order }: { order: AdminOrderSummary }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleOpenDesigner = () => {
    window.open(`/design?id=${order.design.id}&orderId=${order.id}&from=admin`, "_blank")
    setOpen(false)
  }

  const handleExportJson = () => {
    try {
      const snapshot = order as unknown as { designSnapshot: unknown }
      if (!snapshot) return
      const blob = new Blob(
        [JSON.stringify(snapshot.designSnapshot ?? {}, null, 2)],
        { type: "application/json" },
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `keyboard-${order.design.id}-snapshot.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // ignore
    }
    setOpen(false)
  }

  const handleAutoExport = (type: "png" | "svg" | "jig") => {
    window.open(`/design?id=${order.design.id}&autoExport=${type}`, "_blank")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center justify-center w-7 h-7 rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <MoreHorizontal size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1 bg-[#1a1a1a] border border-white/[0.1]">
        <MenuItem
          icon={ExternalLink}
          label="查看详情"
          onClick={() => {
            router.push(`/admin/orders/${order.id}`)
            setOpen(false)
          }}
        />
        <MenuItem
          icon={ExternalLink}
          label="在设计器中打开"
          onClick={handleOpenDesigner}
        />
        <div className="my-1 h-px bg-white/[0.06]" />
        <MenuItem
          icon={FileJson}
          label="导出 JSON 快照"
          onClick={handleExportJson}
        />
        <MenuItem
          icon={ImageIcon}
          label="导出 PNG"
          onClick={() => handleAutoExport("png")}
        />
        <MenuItem
          icon={FileCode2}
          label="导出 SVG"
          onClick={() => handleAutoExport("svg")}
        />
        <MenuItem
          icon={Wrench}
          label="转换治具 SVG"
          onClick={() => handleAutoExport("jig")}
        />
      </PopoverContent>
    </Popover>
  )
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
    >
      <Icon size={14} className="shrink-0 text-white/35" />
      {label}
    </button>
  )
}

// ─── 骨架屏 ───────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3.5 border-b border-white/[0.04] animate-pulse"
        >
          <div className="h-3 w-28 rounded bg-white/[0.06]" />
          <div className="flex-1 h-3 w-32 rounded bg-white/[0.05]" />
          <div className="h-3 w-20 rounded bg-white/[0.05]" />
          <div className="h-5 w-14 rounded bg-white/[0.06]" />
          <div className="h-3 w-20 rounded bg-white/[0.04]" />
          <div className="w-7 h-7 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useAdminOrders({
    status: statusFilter,
    search: search || undefined,
    page,
    limit: 20,
  })

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

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

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white/90">订单管理</h1>
        <p className="mt-1 text-sm text-white/40">
          管理所有用户的键盘定制订单，进行接单、生产、发货等状态操作。
        </p>
      </div>

      {/* 筛选工具栏 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 状态 Tab */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            return (
              <button
                key={String(tab.value)}
                type="button"
                onClick={() => handleStatusFilter(tab.value)}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-white/[0.08] text-white/80"
                    : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* 搜索框 */}
        <div className="relative flex items-center shrink-0">
          <Search size={14} className="absolute left-3 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="搜索订单号…"
            className="w-56 rounded-lg border border-white/[0.08] bg-white/[0.03] pl-8 pr-3 py-1.5 text-xs text-white/70 placeholder-white/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-colors"
          />
        </div>
      </div>

      {/* 统计数字 */}
      {!isLoading && (
        <p className="mb-3 text-xs text-white/30">
          共 {total} 条订单
          {search && (
            <span>
              {" "}·{" "}
              <button
                type="button"
                onClick={() => {
                  setSearch("")
                  setSearchInput("")
                  setPage(1)
                }}
                className="text-white/50 hover:text-white/70 underline underline-offset-2 cursor-pointer"
              >
                清除搜索
              </button>
            </span>
          )}
        </p>
      )}

      {/* 表格 */}
      <div className="rounded-xl border border-white/[0.07] overflow-hidden">
        {/* 表头 */}
        <div className="hidden sm:grid grid-cols-[180px_1fr_140px_100px_130px_40px] items-center px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06]">
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">订单号</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">设计 / 用户</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">金额</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">状态</span>
          <span className="text-[11px] font-medium text-white/30 uppercase tracking-wider">下单时间</span>
          <span />
        </div>

        {/* 内容 */}
        {isLoading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-white/25">暂无订单数据</p>
          </div>
        ) : (
          <div>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onRowClick={() => router.push(`/admin/orders/${order.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-white/30">
            第 {page} / {totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <PaginationButton
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            />
            <PaginationButton
              icon={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 行组件 ────────────────────────────────────────────────────────────────────

function OrderRow({
  order,
  onRowClick,
}: {
  order: AdminOrderSummary
  onRowClick: () => void
}) {
  return (
    <div
      className="group grid grid-cols-[180px_1fr_140px_100px_130px_40px] items-center px-4 py-3.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={onRowClick}
    >
      {/* 订单号 */}
      <div className="min-w-0">
        <p className="text-xs font-mono text-white/60 truncate">{order.orderNo}</p>
      </div>

      {/* 设计 + 用户 */}
      <div className="min-w-0 pr-4">
        <p className="text-sm text-white/80 truncate font-medium">{order.design.name}</p>
        <p className="text-xs text-white/35 truncate mt-0.5">{order.user.email}</p>
      </div>

      {/* 金额 */}
      <div>
        <p className="text-sm font-semibold text-white/75">
          ¥{parseFloat(order.totalAmount).toFixed(2)}
        </p>
      </div>

      {/* 状态 */}
      <div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* 时间 */}
      <div>
        <p className="text-xs text-white/30">
          {formatDistanceToNow(new Date(order.createdAt), {
            addSuffix: true,
            locale: zhCN,
          })}
        </p>
      </div>

      {/* 操作 */}
      <div
        className="flex items-center justify-end"
        onClick={(e) => e.stopPropagation()}
      >
        <OrderActionsMenu order={order} />
      </div>
    </div>
  )
}

function PaginationButton({
  icon: Icon,
  disabled,
  onClick,
}: {
  icon: React.ElementType
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center justify-center w-7 h-7 rounded-md border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      <Icon size={14} />
    </button>
  )
}
