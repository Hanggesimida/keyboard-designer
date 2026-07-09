"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Keyboard, Plus, ArrowLeft, User, Package } from "lucide-react"
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
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import { useMyDesigns, useDesign } from "@/hooks/queries/designs/useDesigns"
import { useAdminOrder } from "@/hooks/queries/admin/useAdminOrders"
import { useUserStore } from "@/store/userStore"
import { useTemporalDesignStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"

// ─── 管理员订单上下文面板 ──────────────────────────────────────────────────────

function AdminOrderContextSection({ orderId, designId }: { orderId: string; designId: string | null }) {
  const { data: order, isLoading } = useAdminOrder(orderId)

  return (
    <PanelSection title="客户方案" first collapsible defaultOpen>
      {isLoading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : order ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-2">
            <User size={12} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] leading-none text-muted-foreground">客户</p>
              <p className="truncate text-xs text-foreground">{order.user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-2">
            <Package size={12} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] leading-none text-muted-foreground">订单号</p>
              <p className="truncate font-mono text-xs text-foreground">{order.orderNo}</p>
            </div>
          </div>

          {/* 当前设计条目 */}
          {designId && (
            <div className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-accent text-accent-foreground">
              <div className="w-10 h-7 rounded shrink-0 flex items-center justify-center overflow-hidden border border-accent-foreground/20 bg-background/30">
                {order.design.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.design.previewUrl}
                    alt={order.design.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Keyboard size={12} className="text-accent-foreground/50" />
                )}
              </div>
              <span className="flex-1 min-w-0 text-xs truncate font-medium">
                {order.design.name}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/60 shrink-0" />
            </div>
          )}

          {/* 返回订单详情 */}
          <a
            href={`/admin/orders/${orderId}`}
            target="_blank"
            rel="noreferrer"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft size={11} />
            返回订单详情
          </a>
        </div>
      ) : (
        <p className="py-1 text-[11px] text-muted-foreground">订单加载失败</p>
      )}
    </PanelSection>
  )
}

// ─── 企业主账号审阅子账号设计上下文面板 ──────────────────────────────────────────

function EnterpriseDesignContextSection({ designId }: { designId: string }) {
  const { data: design, isLoading } = useDesign(designId)
  const designerLabel = design?.user?.name ?? design?.user?.email ?? "设计师"

  return (
    <PanelSection
      title={`正在查看 ${designerLabel} 的设计`}
      first
      collapsible
      defaultOpen
    >
      {isLoading ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : design ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2 py-2">
            <User size={12} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="mb-0.5 text-[11px] leading-none text-muted-foreground">设计师</p>
              {design.user?.name ? (
                <>
                  <p className="truncate text-xs font-medium text-foreground">{design.user.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{design.user.email}</p>
                </>
              ) : (
                <p className="truncate text-xs text-foreground">{design.user?.email ?? "—"}</p>
              )}
            </div>
          </div>

          <div className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-accent text-accent-foreground">
            <div className="w-10 h-7 rounded shrink-0 flex items-center justify-center overflow-hidden border border-accent-foreground/20 bg-background/30">
              {design.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={design.previewUrl}
                  alt={design.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Keyboard size={12} className="text-accent-foreground/50" />
              )}
            </div>
            <span className="flex-1 min-w-0 text-xs truncate font-medium">{design.name}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/60 shrink-0" />
          </div>

          <a
            href="/profile/team-designs"
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft size={11} />
            返回团队设计
          </a>
        </div>
      ) : (
        <p className="py-1 text-[11px] text-muted-foreground">设计加载失败</p>
      )}
    </PanelSection>
  )
}

// ─── 普通用户设计列表面板 ──────────────────────────────────────────────────────

export function DesignListSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDesignId = searchParams.get("id")
  const fromAdmin = searchParams.get("from") === "admin"
  const fromEnterprise = searchParams.get("from") === "enterprise"
  const orderId = searchParams.get("orderId")
  const accessToken = useUserStore((s) => s.accessToken)

  // undo 历史长度 > 0 说明新建设计已有改动
  const pastLength = useTemporalDesignStore((s) => s.pastStates.length)
  const hasUnsavedChanges = !currentDesignId && pastLength > 0

  const { data: designs, isLoading } = useMyDesigns()

  // 待确认跳转的目标路径
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  function handleNavigate(href: string) {
    if (hasUnsavedChanges) {
      setPendingHref(href)
    } else {
      router.push(href)
    }
  }

  function handleConfirmLeave() {
    if (pendingHref) router.push(pendingHref)
    setPendingHref(null)
  }

  if (!accessToken) return null

  // 管理员审阅模式：用订单上下文面板替换我的设计列表
  if (fromAdmin && orderId) {
    return <AdminOrderContextSection orderId={orderId} designId={currentDesignId} />
  }

  // 企业主账号审阅模式：用团队设计上下文面板替换我的设计列表
  if (fromEnterprise && currentDesignId) {
    return <EnterpriseDesignContextSection designId={currentDesignId} />
  }

  return (
    <>
      <PanelSection
        title="我的设计"
        first
        collapsible
        defaultOpen
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            title="新建设计"
            onClick={() => handleNavigate("/design")}
          >
            <Plus size={12} />
          </Button>
        }
      >
        <div className="max-h-[280px] overflow-y-auto -mx-0.5 px-0.5 space-y-1 scrollbar-thin">
          {isLoading ? (
            <DesignListSkeleton />
          ) : !designs || designs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Keyboard size={20} className="text-muted-foreground/40" />
              <p className="text-[11px] text-muted-foreground/50 text-center">
                还没有设计，点击 + 新建
              </p>
            </div>
          ) : (
            <>
              {/* 未保存新设计条目：仅在当前为新建（无 id）时显示 */}
              {!currentDesignId && (
                <div className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-accent text-accent-foreground">
                  <div className="w-10 h-7 rounded shrink-0 flex items-center justify-center overflow-hidden border border-accent-foreground/20 bg-background/30">
                    <Keyboard size={12} className="text-accent-foreground/50" />
                  </div>
                  <span className="flex-1 min-w-0 text-xs truncate font-medium">
                    未保存的新设计
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/60 shrink-0" />
                </div>
              )}

              {designs.map((design) => {
                const isActive = currentDesignId === design.id
                return (
                  <button
                    key={design.id}
                    type="button"
                    onClick={() => handleNavigate(`/design?id=${design.id}`)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer group",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60 text-foreground/70 hover:text-foreground"
                    )}
                  >
                    {/* 缩略图 */}
                    <div
                      className={cn(
                        "w-10 h-7 rounded shrink-0 flex items-center justify-center overflow-hidden border",
                        isActive
                          ? "border-accent-foreground/20 bg-background/30"
                          : "border-border bg-muted/30"
                      )}
                    >
                      {design.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={design.previewUrl}
                          alt={design.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Keyboard
                          size={12}
                          className={cn(
                            isActive ? "text-accent-foreground/50" : "text-muted-foreground/40"
                          )}
                        />
                      )}
                    </div>

                    {/* 名称 */}
                    <span className="flex-1 min-w-0 text-xs truncate font-medium">
                      {design.name}
                    </span>

                    {/* 当前激活指示点 */}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-foreground/60 shrink-0" />
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </PanelSection>

      {/* 离开确认弹窗 */}
      <AlertDialog
        open={!!pendingHref}
        onOpenChange={(open) => !open && setPendingHref(null)}
      >
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>设计尚未保存</AlertDialogTitle>
            <AlertDialogDescription>
              当前新设计有未保存的改动，切换后这些改动将会丢失。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmLeave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              放弃并切换
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function DesignListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
          <Skeleton className="h-7 w-10 shrink-0 rounded" />
          <Skeleton className="h-3 flex-1 rounded" />
        </div>
      ))}
    </>
  )
}
