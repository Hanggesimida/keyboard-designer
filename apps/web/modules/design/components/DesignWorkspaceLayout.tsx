"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Home, Monitor } from "lucide-react"
import { buttonVariants } from "@workspace/ui/components/button"
import { DesignSidebarLeft } from "./sidebar/SidebarLeft"
import { DesignSidebarRight } from "./sidebar/SidebarRight"
import { SidebarResizeHandle } from "./sidebar/SidebarResizeHandle"
import { DesignCanvas } from "./canvas/DesignCanvas"
import { DesignLoadingScreen } from "./DesignLoadingScreen"
import { useTemporalDesignStore } from "@/modules/design/store/designUiStore"
import { useLoadDesignFromUrl } from "@/modules/design/hooks/useLoadDesignFromUrl"
import { usePhysicalKeyPress } from "@/modules/design/hooks/usePhysicalKeyPress"
import { useResizableWidth } from "@/modules/design/hooks/useResizableWidth"
import {
  SIDEBAR_LEFT_WIDTH_DEFAULT,
  SIDEBAR_LEFT_WIDTH_MAX,
  SIDEBAR_LEFT_WIDTH_MIN,
  SIDEBAR_LEFT_WIDTH_STORAGE_KEY,
  SIDEBAR_RIGHT_WIDTH_DEFAULT,
  SIDEBAR_RIGHT_WIDTH_MAX,
  SIDEBAR_RIGHT_WIDTH_MIN,
  SIDEBAR_RIGHT_WIDTH_STORAGE_KEY,
} from "@/modules/design/lib/sidebar/constants"
import { DESIGN_EXPORTED_EVENT } from "@/modules/design/lib/session-events"
import { useSessionFontStore } from "@/lib/fonts/sessionFontStore"

export function DesignWorkspaceLayout() {
  const t = useTranslations("Design.mobile")
  const tSidebar = useTranslations("Design.sidebar")
  const tCommon = useTranslations("Common")
  const leftSidebar = useResizableWidth({
    defaultWidth: SIDEBAR_LEFT_WIDTH_DEFAULT,
    min: SIDEBAR_LEFT_WIDTH_MIN,
    max: SIDEBAR_LEFT_WIDTH_MAX,
    storageKey: SIDEBAR_LEFT_WIDTH_STORAGE_KEY,
    edge: "end",
  })
  const rightSidebar = useResizableWidth({
    defaultWidth: SIDEBAR_RIGHT_WIDTH_DEFAULT,
    min: SIDEBAR_RIGHT_WIDTH_MIN,
    max: SIDEBAR_RIGHT_WIDTH_MAX,
    storageKey: SIDEBAR_RIGHT_WIDTH_STORAGE_KEY,
    edge: "start",
  })
  const undo = useTemporalDesignStore((s) => s.undo)
  const redo = useTemporalDesignStore((s) => s.redo)
  const historyPosition = useTemporalDesignStore(
    (s) => `${s.pastStates.length}:${s.futureStates.length}`,
  )
  const previousHistoryPosition = useRef(historyPosition)
  const [hasUnexportedChanges, setHasUnexportedChanges] = useState(false)
  const clearSessionFonts = useSessionFontStore((state) => state.clearFonts)

  useLoadDesignFromUrl()
  usePhysicalKeyPress()

  useEffect(() => {
    if (previousHistoryPosition.current !== historyPosition) {
      previousHistoryPosition.current = historyPosition
      setHasUnexportedChanges(true)
    }
  }, [historyPosition])

  useEffect(() => {
    const handleExported = () => setHasUnexportedChanges(false)
    window.addEventListener(DESIGN_EXPORTED_EVENT, handleExported)
    return () =>
      window.removeEventListener(DESIGN_EXPORTED_EVENT, handleExported)
  }, [])

  useEffect(() => {
    return () => clearSessionFonts()
  }, [clearSessionFonts])

  useEffect(() => {
    if (!hasUnexportedChanges) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnexportedChanges])

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
        <h1 className="mb-3 text-xl font-semibold text-foreground">{t("title")}</h1>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {t("body")}
        </p>
        <Link href="/" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
          <Home size={15} />
          {tCommon("backHome")}
        </Link>
      </div>

      {/* 正常桌面端布局 */}
      <div className="relative hidden md:flex h-dvh w-full overflow-hidden bg-background">
        {/* 左侧栏 */}
        <div className="relative h-full shrink-0" style={{ width: leftSidebar.width }}>
          <DesignSidebarLeft />
          <SidebarResizeHandle
            side="left"
            width={leftSidebar.width}
            min={SIDEBAR_LEFT_WIDTH_MIN}
            max={SIDEBAR_LEFT_WIDTH_MAX}
            label={tSidebar("resizeLeft")}
            title={tSidebar("dragResize")}
            onPointerDown={leftSidebar.onPointerDown}
            onPointerMove={leftSidebar.onPointerMove}
            onPointerUp={leftSidebar.onPointerUp}
            onDoubleClick={leftSidebar.onDoubleClick}
          />
        </div>

        {/* 画布区域（含可选顶部 3D 预览） */}
        <div className="min-w-0 flex-1">
          <DesignCanvas />
        </div>

        {/* 右侧栏 */}
        <div className="relative h-full shrink-0" style={{ width: rightSidebar.width }}>
          <DesignSidebarRight />
          <SidebarResizeHandle
            side="right"
            width={rightSidebar.width}
            min={SIDEBAR_RIGHT_WIDTH_MIN}
            max={SIDEBAR_RIGHT_WIDTH_MAX}
            label={tSidebar("resizeRight")}
            title={tSidebar("dragResize")}
            onPointerDown={rightSidebar.onPointerDown}
            onPointerMove={rightSidebar.onPointerMove}
            onPointerUp={rightSidebar.onPointerUp}
            onDoubleClick={rightSidebar.onDoubleClick}
          />
        </div>

        {/* 初始加载进度条 */}
        <DesignLoadingScreen />
      </div>
    </>
  )
}
