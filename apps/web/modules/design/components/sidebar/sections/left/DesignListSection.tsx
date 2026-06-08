"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Keyboard, Plus } from "lucide-react"
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
import { cn } from "@workspace/ui/lib/utils"
import { useMyDesigns } from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import { useTemporalDesignStore } from "@/modules/design/store/designUiStore"
import { PanelSection } from "../../panel-section"

export function DesignListSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentDesignId = searchParams.get("id")
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

  return (
    <>
      <PanelSection
        title="我的设计"
        first
        collapsible
        defaultOpen
        action={
          <button
            type="button"
            title="新建设计"
            onClick={() => handleNavigate("/design")}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Plus size={12} />
          </button>
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
                          : "border-white/10 bg-white/[0.04]"
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
                            isActive ? "text-accent-foreground/50" : "text-white/20"
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
              className="bg-red-500 hover:bg-red-600 text-white"
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
          <div className="w-10 h-7 rounded bg-white/[0.06] animate-pulse shrink-0" />
          <div className="flex-1 h-3 rounded bg-white/[0.06] animate-pulse" />
        </div>
      ))}
    </>
  )
}
