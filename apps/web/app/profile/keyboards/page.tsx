"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Keyboard, Plus, Pencil, Trash2, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
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
import { ProfileLayout, ProfileSection, ProfileEmptyState } from "@/modules/profile"
import { useMyDesigns, useDeleteDesign } from "@/hooks/queries/designs/useDesigns"
import { Button } from "@workspace/ui/components/button"

export default function ProfileKeyboardsPage() {
  const router = useRouter()
  const { data: designs, isLoading } = useMyDesigns()
  const { mutate: deleteDesign, isPending: isDeleting } = useDeleteDesign()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  function handleConfirmDelete() {
    if (!deleteTargetId) return
    deleteDesign(deleteTargetId, {
      onSuccess: () => setDeleteTargetId(null),
    })
  }

  return (
    <ProfileLayout
      title="我的键盘"
      description="管理你保存的所有键盘设计方案。"
    >
      <ProfileSection
        action={
          <Button asChild size="sm" className="cursor-pointer">
            <Link href="/design">
              <Plus />
              新建设计
            </Link>
          </Button>
        }
      >
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
                className="group relative flex flex-col gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                {/* 预览图占位 */}
                <div className="w-full aspect-video rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden">
                  {design.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={design.previewUrl}
                      alt={design.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Keyboard size={24} className="text-white/20" />
                  )}
                </div>

                {/* 名称与时间 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">{design.name}</p>
                  <p className="mt-0.5 text-xs text-white/30">
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
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/design?id=${design.id}`)}
                    className="cursor-pointer"
                  >
                    <ExternalLink />
                    预览
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setDeleteTargetId(design.id)}
                    className="ml-auto text-white/30 hover:text-red-400 hover:bg-red-400/10 cursor-pointer"
                    aria-label="删除设计"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent className="bg-[#1a1a1a] border border-white/[0.1] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除设计</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              此操作不可撤销，设计数据将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/5">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProfileLayout>
  )
}

function DesignGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02]"
        >
          <div className="w-full aspect-video rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-white/[0.06] animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-white/[0.04] animate-pulse" />
        </div>
      ))}
    </div>
  )
}
