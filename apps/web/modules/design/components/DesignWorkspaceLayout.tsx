"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Home, Monitor } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { DesignSidebarLeft } from "./sidebar/SidebarLeft"
import { DesignSidebarRight } from "./sidebar/SidebarRight"
import { DesignCanvas } from "./canvas/DesignCanvas"
import { DesignLoadingScreen } from "./DesignLoadingScreen"
import { useTemporalDesignStore } from "@/modules/design/store/designUiStore"
import { useLoadDesignFromUrl } from "@/modules/design/hooks/useLoadDesignFromUrl"
import { useUserFonts } from "@/hooks/queries/fonts/useFonts"

export function DesignWorkspaceLayout() {
  const undo = useTemporalDesignStore((s) => s.undo)
  const redo = useTemporalDesignStore((s) => s.redo)
  useLoadDesignFromUrl()
  // 预拉取「我的字体」并注入 FontFace，供画布与导出使用
  useUserFonts()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo])

  return (
    <>
      {/* 移动端不支持提示（768px 以下） */}
      <div className="flex md:hidden h-dvh w-full flex-col items-center justify-center bg-background px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border">
          <Monitor size={28} className="text-muted-foreground" />
        </div>
        <h1 className="mb-3 text-xl font-semibold text-foreground">需要更大的屏幕</h1>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
          设计编辑器需要在 768px 以上的屏幕上使用，请切换到桌面端或平板横屏模式。
        </p>
        <Button variant="outline" asChild>
          <Link href="/" className="gap-2">
            <Home size={15} />
            返回首页
          </Link>
        </Button>
      </div>

      {/* 正常桌面端布局 */}
      <div className="relative hidden md:flex h-dvh w-full overflow-hidden bg-background">
        {/* 左侧栏 */}
        <div className="h-full w-[240px] shrink-0">
          <DesignSidebarLeft />
        </div>

        {/* 画布区域 */}
        <div className="min-w-0 flex-1">
          <DesignCanvas />
        </div>

        {/* 右侧栏 */}
        <div className="h-full w-[260px] shrink-0">
          <DesignSidebarRight />
        </div>

        {/* 初始加载进度条 */}
        <DesignLoadingScreen />
      </div>
    </>
  )
}
