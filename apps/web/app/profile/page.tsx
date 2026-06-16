"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Keyboard, Plus, Pencil } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  ProfileSection,
  ProfileStatCard,
  ProfileEmptyState,
} from "@/modules/profile"
import { useUserStore } from "@/store/userStore"
import { useMyDesigns } from "@/hooks/queries/designs/useDesigns"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@/components/ui/PageHeader"

export default function ProfilePage() {
  const router = useRouter()
  const user = useUserStore((s) => s.user)
  const { data: designs, isLoading: isDesignsLoading } = useMyDesigns()
  const designCount = designs?.length ?? 0
  const recentDesigns = designs?.slice(0, 3) ?? []

  return (
    <div className="space-y-8">
        <PageHeader title="个人主页" description="查看你的键盘设计概览与最近动态。" />

        {/* 统计数据 */}
        <ProfileSection title="数据概览">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ProfileStatCard
              label="键盘设计"
              value={isDesignsLoading ? "—" : designCount}
              icon={Keyboard}
              hint={designCount === 0 ? "暂无设计" : `共 ${designCount} 个方案`}
            />
          </div>
        </ProfileSection>

        {/* 最近设计 */}
        <ProfileSection
          title="最近设计"
          description="你最近创建或编辑的键盘方案"
          action={
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/design">
                <Plus />
                新建设计
              </Link>
            </Button>
          }
        >
          {isDesignsLoading ? (
            <RecentDesignsSkeleton />
          ) : recentDesigns.length === 0 ? (
            <ProfileEmptyState
              icon={Keyboard}
              title="还没有键盘设计"
              description="前往设计器，创建你的第一个键盘方案。"
              action={{ label: "开始设计", href: "/design" }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentDesigns.map((design) => (
                <div
                  key={design.id}
                  className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/40 transition-colors"
                >
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
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/design?id=${design.id}`)}
                    className="cursor-pointer"
                  >
                    <Pencil />
                    编辑
                  </Button>
                </div>
                </div>
              ))}
            </div>
          )}
        </ProfileSection>
    </div>
  )
}

function RecentDesignsSkeleton() {
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
