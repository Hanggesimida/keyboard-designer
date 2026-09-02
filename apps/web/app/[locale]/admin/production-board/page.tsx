"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Keyboard,
  Package,
  RefreshCw,
  Clock,
  Zap,
  ExternalLink,
  ImageIcon,
  Maximize2,
  Minimize2,
  type LucideIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { useProductionBoard, useUpdateOrderStatus } from "@/hooks/queries/admin/useAdminOrders"
import { PageHeader } from "@/components/layouts/PageHeader"
import { ORDER_STATUS_CONFIG } from "@/modules/orders"
import type { ProductionBoardItem } from "@/lib/api/admin-orders"
import type { UpdateOrderStatusPayload } from "@/lib/api/admin-orders"
import { Link } from "@/i18n/navigation"

// ─── 状态列配置 ────────────────────────────────────────────────────────────────

const COLUMN_CONFIG = [
  {
    status: "APPROVED" as const,
    titleKey: "pending" as const,
    color: "text-violet-400",
    borderColor: "border-violet-400/30",
    bgColor: "bg-violet-400/[0.04]",
    dotColor: "bg-violet-400",
    icon: Clock,
    nextStatus: "PROCESSING" as const,
    nextLabelKey: "start" as const,
    nextCls: "border-blue-400/30 text-blue-400/80 hover:bg-blue-400/10",
  },
  {
    status: "PROCESSING" as const,
    titleKey: "processing" as const,
    color: "text-blue-400",
    borderColor: "border-blue-400/30",
    bgColor: "bg-blue-400/[0.04]",
    dotColor: "bg-blue-400",
    icon: Zap,
    nextStatus: "SHIPPING" as const,
    nextLabelKey: "ship" as const,
    nextCls: "border-orange-400/30 text-orange-400/80 hover:bg-orange-400/10",
  },
]

// ─── useFullscreen hook ───────────────────────────────────────────────────────

function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  const enter = useCallback(() => {
    ref.current?.requestFullscreen().catch(() => {})
  }, [])

  const exit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      ref.current?.requestFullscreen().catch(() => {})
    }
  }, [])

  return { ref, isFullscreen, enter, exit, toggle }
}

// ─── 单张订单卡片 ──────────────────────────────────────────────────────────────

interface ProductionCardProps {
  item: ProductionBoardItem
  onAdvance: (id: string, payload: UpdateOrderStatusPayload) => void
  isPending: boolean
  isFullscreen: boolean
}

function ProductionCard({ item, onAdvance, isPending, isFullscreen }: ProductionCardProps) {
  const t = useTranslations("Admin.board")
  const tStatus = useTranslations("OrderStatus")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const col = COLUMN_CONFIG.find((c) => c.status === item.status)!
  const statusCfg = ORDER_STATUS_CONFIG[item.status]

  const snapshot = item.designSnapshot as Record<string, unknown> | null
  const specText = snapshot
    ? (() => {
        const layoutName =
          (snapshot.layoutName as string | undefined) ||
          (snapshot.layout as string | undefined)
        const keysCount =
          (snapshot.keysCount as number | undefined) ||
          (snapshot.totalKeys as number | undefined)
        if (layoutName && keysCount) return `${layoutName} · ${t("keyCount", { count: keysCount })}`
        if (layoutName) return layoutName
        if (keysCount) return t("keyCount", { count: keysCount })
        return null
      })()
    : null

  return (
    <div
      className={[
        "rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md",
        col.borderColor,
        col.bgColor,
      ].join(" ")}
    >
      {/* 卡片头 */}
      <div className={["flex items-start gap-3 p-4 pb-3", isFullscreen && "p-5 pb-4"].join(" ")}>
        <div
          className={[
            "rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0",
            isFullscreen ? "w-20 h-14" : "w-16 h-11",
          ].join(" ")}
        >
          {item.design.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.design.previewUrl}
              alt={item.design.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Keyboard size={isFullscreen ? 20 : 16} className="text-muted-foreground/35" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={[
              "font-semibold text-foreground/85 truncate leading-snug",
              isFullscreen ? "text-base" : "text-sm",
            ].join(" ")}
          >
            {item.design.name}
          </p>
          <p
            className={[
              "mt-0.5 font-mono text-muted-foreground/50 truncate",
              isFullscreen ? "text-xs" : "text-[11px]",
            ].join(" ")}
          >
            {item.orderNo}
          </p>
        </div>

        <span
          className={[
            "shrink-0 font-medium px-2 py-0.5 rounded-full border",
            isFullscreen ? "text-xs" : "text-[10px]",
            statusCfg.badgeCls,
          ].join(" ")}
        >
          {tStatus(item.status)}
        </span>
      </div>

      <div className="mx-4 border-t border-border/40" />

      {/* 生产信息 */}
      <div className={["px-4 py-3 space-y-1.5", isFullscreen && "px-5 py-4 space-y-2"].join(" ")}>
        <InfoLine icon={Package} label={t("quantity")} value={t("setCount", { count: item.quantity })} fullscreen={isFullscreen} />
        <InfoLine icon={Package} label={t("packaging")} value={t("standardPack")} fullscreen={isFullscreen} />
        {specText && <InfoLine icon={Keyboard} label={t("spec")} value={specText} fullscreen={isFullscreen} />}
        {item.note && <InfoLine icon={Package} label={t("note")} value={item.note} fullscreen={isFullscreen} />}
      </div>

      {/* 底部操作 */}
      <div
        className={[
          "flex items-center justify-between gap-2 px-4 py-3 border-t border-border/40",
          isFullscreen && "px-5 py-4",
        ].join(" ")}
      >
        <p className={["text-muted-foreground/40", isFullscreen ? "text-xs" : "text-[10px]"].join(" ")}>
          {formatDistanceToNow(new Date(item.updatedAt), {
            addSuffix: true,
            locale: dateLocale,
          })}
        </p>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/orders/${item.id}`}
            title={t("viewOrder")}
            className={[
              "flex items-center justify-center rounded-lg border border-border text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/50 transition-colors",
              isFullscreen ? "w-8 h-8" : "w-7 h-7",
            ].join(" ")}
          >
            <ExternalLink size={isFullscreen ? 14 : 12} />
          </Link>

          <a
            href={`/design?id=${item.design.id}&orderId=${item.id}&from=admin`}
            target="_blank"
            rel="noreferrer"
            title={t("openInEditor")}
            className={[
              "flex items-center justify-center rounded-lg border border-border text-muted-foreground/50 hover:text-foreground/70 hover:bg-muted/50 transition-colors",
              isFullscreen ? "w-8 h-8" : "w-7 h-7",
            ].join(" ")}
          >
            <ImageIcon size={isFullscreen ? 14 : 12} />
          </a>

          <button
            type="button"
            disabled={isPending}
            onClick={() => onAdvance(item.id, { status: col.nextStatus })}
            className={[
              "flex items-center gap-1 px-2.5 rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer",
              isFullscreen ? "py-1.5 text-xs" : "py-1 text-[11px]",
              col.nextCls,
            ].join(" ")}
          >
            {t(col.nextLabelKey)}
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoLine({
  icon: Icon,
  label,
  value,
  fullscreen,
}: {
  icon: LucideIcon
  label: string
  value: string
  fullscreen?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={fullscreen ? 13 : 11} className="text-muted-foreground/35 shrink-0" />
      <span
        className={[
          "text-muted-foreground/50 shrink-0 w-8",
          fullscreen ? "text-xs" : "text-[11px]",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "text-foreground/65 truncate",
          fullscreen ? "text-xs" : "text-[11px]",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

// ─── 列骨架屏 ──────────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[168px] rounded-xl border border-border bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionBoardPage() {
  const t = useTranslations("Admin.board")
  const { data, isLoading, refetch, isFetching } = useProductionBoard()
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus()
  const { ref, isFullscreen, toggle } = useFullscreen()

  const items = data?.items ?? []
  const approvedItems = items.filter((o) => o.status === "APPROVED")
  const processingItems = items.filter((o) => o.status === "PROCESSING")

  function handleAdvance(id: string, payload: UpdateOrderStatusPayload) {
    updateStatus({ id, payload })
  }

  // 全屏时按 Escape 已由浏览器原生处理，额外支持 F 键切换
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "f" || e.key === "F") {
        // 避免在输入框中触发
        if (document.activeElement?.tagName === "INPUT") return
        toggle()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggle])

  return (
    // ref 挂载到最外层容器，全屏时撑满整个屏幕
    <div
      ref={ref}
      className={[
        "transition-colors duration-200",
        isFullscreen
          ? "fixed inset-0 z-[9999] bg-background overflow-y-auto px-8 py-6"
          : "",
      ].join(" ")}
    >
      {/* 页头 */}
      <PageHeader
        title={t("title")}
        description={isFullscreen ? undefined : t("subtitle")}
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground/70 transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
              {t("refresh")}
            </button>

            <button
              type="button"
              onClick={toggle}
              title={isFullscreen ? t("exitFullscreenEsc") : t("enterFullscreen")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground/70 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreen ? t("exitFullscreen") : t("fullscreen")}
            </button>
          </div>
        }
      />

      {/* 看板列 */}
      <div
        className={[
          "grid grid-cols-1 gap-6",
          isFullscreen ? "lg:grid-cols-2 gap-8" : "lg:grid-cols-2",
        ].join(" ")}
      >
        {COLUMN_CONFIG.map((col) => {
          const colItems =
            col.status === "APPROVED" ? approvedItems : processingItems
          const ColIcon = col.icon

          return (
            <div key={col.status}>
              {/* 列标题 */}
              <div className={["flex items-center gap-2 mb-3", isFullscreen && "mb-4"].join(" ")}>
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <ColIcon size={isFullscreen ? 16 : 14} className={col.color} />
                <h2
                  className={[
                    "font-semibold",
                    col.color,
                    isFullscreen ? "text-base" : "text-sm",
                  ].join(" ")}
                >
                  {t(col.titleKey)}
                </h2>
                <span
                  className={[
                    "ml-auto tabular-nums text-muted-foreground/50 bg-muted/40 px-2 py-0.5 rounded-full",
                    isFullscreen ? "text-sm" : "text-xs",
                  ].join(" ")}
                >
                  {isLoading ? "—" : colItems.length}
                </span>
              </div>

              {/* 列内容 */}
              {isLoading ? (
                <ColumnSkeleton />
              ) : colItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-14 gap-2">
                  <Package size={22} className="text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground/35">{t("empty")}</p>
                </div>
              ) : (
                <div className={["space-y-3", isFullscreen && "space-y-4"].join(" ")}>
                  {colItems.map((item) => (
                    <ProductionCard
                      key={item.id}
                      item={item}
                      onAdvance={handleAdvance}
                      isPending={isPending}
                      isFullscreen={isFullscreen}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
