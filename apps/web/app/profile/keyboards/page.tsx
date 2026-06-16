"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Keyboard, Pencil, Trash2, ShoppingBag } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { ProfileSection, ProfileEmptyState } from "@/modules/profile"
import { PageHeader } from "@/components/layouts/PageHeader"
import { useMyDesigns, useDeleteDesign } from "@/hooks/queries/designs/useDesigns"
import { Button } from "@workspace/ui/components/button"

export default function ProfileKeyboardsPage() {
  const router = useRouter()
  const { data: designs, isLoading } = useMyDesigns()
  const { mutate: deleteDesign, isPending: isDeleting } = useDeleteDesign()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function handleOpenDelete(id: string) {
    setConfirmId(id)
  }

  function handleConfirmDelete() {
    if (!confirmId) return
    const id = confirmId
    setConfirmId(null)
    deleteDesign(id, {
      onError: (err) => {
        setErrorMessage(err.message || "删除失败，请稍后重试")
      },
    })
  }

  return (
    <>
      <PageHeader
        title="我的设计"
        description="管理你创建的所有键盘设计方案，支持编辑与删除。"
        action={
          <Button asChild className="w-full sm:w-auto cursor-pointer">
            <Link href="/design">
              <Keyboard size={15} />
              新建设计
            </Link>
          </Button>
        }
      />

      <ProfileSection>
        {isLoading ? (
          <DesignGridSkeleton />
        ) : !designs || designs.length === 0 ? (
          <ProfileEmptyState
            icon={Keyboard}
            title="还没有键盘设计"
            description="前往设计器，创建并保存你的第一个键盘方案。"
            action={{ label: "开始设计", href: "/design" }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {designs.map((design) => (
              <div
                key={design.id}
                className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 transition-colors"
              >
                {/* 预览图占位 */}
                <div className="w-full aspect-video rounded-lg bg-muted/40 border border-border/60 flex items-center justify-center overflow-hidden">
                  {design.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.previewUrl}
                      alt={design.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Keyboard size={24} className="text-muted-foreground/35" />
                  )}
                </div>

                {/* 名称与时间 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground/80 truncate">{design.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/55">
                    {formatDistanceToNow(new Date(design.updatedAt), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                    更新
                  </p>
                </div>

                {/* 操作按钮（hover 显示） */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/design?id=${design.id}`)}
                    className="cursor-pointer"
                  >
                    <Pencil />
                    编辑
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => handleOpenDelete(design.id)}
                    className="ml-auto text-muted-foreground/55 hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    aria-label="删除此设计"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      {/* 确认删除弹窗 */}
      <Dialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除设计</DialogTitle>
            <DialogDescription>
              此操作不可撤销，设计数据将被永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmId(null)}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground" />
                  删除中…
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  确认删除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除失败提示弹窗 */}
      <Dialog open={!!errorMessage} onOpenChange={(open) => !open && setErrorMessage(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <ShoppingBag size={18} className="text-amber-400" />
              </div>
              <DialogTitle>无法删除此设计</DialogTitle>
            </div>
            <DialogDescription className="pt-1">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setErrorMessage(null)}
              className="cursor-pointer"
            >
              我知道了
            </Button>
            <Button asChild className="cursor-pointer">
              <Link href="/profile/orders">查看我的订单</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DesignGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30"
        >
          <div className="w-full aspect-video rounded-lg bg-muted/40 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-muted/50 animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-muted/40 animate-pulse" />
        </div>
      ))}
    </div>
  )
}
