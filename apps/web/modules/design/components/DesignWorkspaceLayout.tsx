"use client"

import { useEffect } from "react"
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
    <div className="relative flex h-dvh w-full overflow-hidden bg-[#1e1e1e]">
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
  )
}
