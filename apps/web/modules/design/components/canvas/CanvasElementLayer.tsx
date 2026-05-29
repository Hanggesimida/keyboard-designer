"use client"

import { useCallback } from "react"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import type { Viewport } from "@/modules/design/hooks/useViewport"
import { CanvasImageElement } from "./CanvasImageElement"

interface Props {
  /** 当前视口变换（用于根据 zoom 缩放交互控件尺寸） */
  viewport: Viewport
  /** 画板原始宽高（世界坐标） */
  artW: number
  artH: number
  /** 空格键是否按下（按下时左键拖拽应移动画布而非图片） */
  isSpacePressed?: boolean
  /** 是否正在平移画布（决定光标样式） */
  isPanning?: boolean
}

export function CanvasElementLayer({ viewport, artW, artH, isSpacePressed = false, isPanning = false }: Props) {
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const selectedElementId = useDesignUIStore((s) => s.selectedElementId)
  const setSelectedElementId = useDesignUIStore((s) => s.setSelectedElementId)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)

  const handleToggleClipToKeycaps = useCallback(
    (id: string) => {
      const el = useDesignUIStore.getState().canvasElements.find((e) => e.id === id)
      if (!el || el.type !== "image") return
      updateCanvasElement(id, { clipToKeycaps: !el.clipToKeycaps })
    },
    [updateCanvasElement],
  )

  const handleDragMove = useCallback(
    (id: string, dx: number, dy: number) => {
      const el = useDesignUIStore.getState().canvasElements.find((e) => e.id === id)
      if (!el) return
      updateCanvasElement(id, {
        x: Math.round(el.x + dx),
        y: Math.round(el.y + dy),
      })
    },
    [updateCanvasElement],
  )

  const handleRotate = useCallback(
    (id: string, deg: number) => {
      updateCanvasElement(id, { rotation: deg })
    },
    [updateCanvasElement],
  )

  const handleRestoreAspect = useCallback(
    (id: string, w: number, h: number) => {
      updateCanvasElement(id, { width: w, height: h })
    },
    [updateCanvasElement],
  )

  const handleResizeCommit = useCallback(
    (id: string, x: number, y: number, w: number, h: number) => {
      updateCanvasElement(id, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(w),
        height: Math.round(h),
      })
    },
    [updateCanvasElement],
  )

  if (canvasElements.length === 0) return null

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: artW,
        height: artH,
        pointerEvents: "none",
      }}
    >
      {canvasElements.map((el) => {
        if (el.type !== "image") return null
        // clipToKeycapId 且开启裁切时在 SVG 层渲染；关闭裁切后回到 HTML 自由层
        if (el.clipToKeycapId && (el.clipToKeycaps ?? true)) return null
        return (
          <div key={el.id} style={{ pointerEvents: "auto" }}>
            <CanvasImageElement
              element={el}
              isSelected={selectedElementId === el.id}
              zoom={viewport.zoom}
              isSpacePressed={isSpacePressed}
              isPanning={isPanning}
              onSelect={() => setSelectedElementId(el.id)}
              onDragMove={handleDragMove}
              onResizeCommit={handleResizeCommit}
              onRestoreAspect={handleRestoreAspect}
              onRotate={handleRotate}
              onToggleClipToKeycaps={handleToggleClipToKeycaps}
            />
          </div>
        )
      })}
    </div>
  )
}
