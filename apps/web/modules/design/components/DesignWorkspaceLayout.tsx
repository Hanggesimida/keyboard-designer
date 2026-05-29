"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Home, Monitor } from "lucide-react"
import { DesignSidebarLeft } from "./sidebar/SidebarLeft"
import { DesignSidebarRight } from "./sidebar/SidebarRight"
import { DesignCanvas } from "./canvas/DesignCanvas"
import { DesignLoadingScreen } from "./DesignLoadingScreen"
import { useTemporalDesignStore } from "@/modules/design/store/designUiStore"

export function DesignWorkspaceLayout() {
  const undo = useTemporalDesignStore((s) => s.undo)
  const redo = useTemporalDesignStore((s) => s.redo)

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
      <div className="flex md:hidden h-dvh w-full flex-col items-center justify-center bg-[#0d0d0d] px-6 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10">
          <Monitor size={28} className="text-white/40" />
        </div>
        <h1 className="mb-3 text-xl font-semibold text-white">需要更大的屏幕</h1>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-white/40">
          设计编辑器需要在 768px 以上的屏幕上使用，请切换到桌面端或平板横屏模式。
        </p>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white/60 transition-all duration-200 hover:bg-white/[0.1] hover:text-white/90 active:scale-95"
        >
          <Home size={15} />
          返回首页
        </Link>
      </div>

      {/* 正常桌面端布局 */}
      <div className="relative hidden md:flex h-dvh w-full overflow-hidden bg-[#1e1e1e]">
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
