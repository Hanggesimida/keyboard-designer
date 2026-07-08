"use client"

import { useCallback, useMemo } from "react"
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
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)
  const setSelectedElementId = useDesignUIStore((s) => s.setSelectedElementId)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const setElementKeycapRestriction = useDesignUIStore((s) => s.setElementKeycapRestriction)

  const handleToggleClipToKeycaps = useCallback(
    (id: string) => {
      const el = useDesignUIStore.getState().canvasElements.find((e) => e.id === id)
      if (!el || el.type !== "image") return
      updateCanvasElement(id, { clipToKeycaps: !el.clipToKeycaps })
    },
    [updateCanvasElement],
  )

  const handleRestrictToSelectedKeycaps = useCallback(
    (id: string) => {
      const { selectedKeycapIds: keyIds } = useDesignUIStore.getState()
      if (keyIds.length === 0) return
      setElementKeycapRestriction(id, keyIds)
    },
    [setElementKeycapRestriction],
  )

  const handleClearKeycapRestriction = useCallback(
    (id: string) => {
      setElementKeycapRestriction(id, null)
    },
    [setElementKeycapRestriction],
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

  // 已选中的图片置于 HTML 层最顶，便于拖拽编辑裁切图
  const htmlLayerImages = useMemo(() => {
    const images = canvasElements.filter(
      (el) => el.type === "image" && !(el.clipToKeycapId && (el.clipToKeycaps ?? true)),
    )
    if (!selectedElementId) return images
    const selected = images.find((el) => el.id === selectedElementId)
    if (!selected) return images
    return [...images.filter((el) => el.id !== selectedElementId), selected]
  }, [canvasElements, selectedElementId])

  if (htmlLayerImages.length === 0) return null

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
      {htmlLayerImages.map((el) => {
        return (
          <CanvasImageElement
            key={el.id}
            element={el}
            isSelected={selectedElementId === el.id}
            zoom={viewport.zoom}
            isSpacePressed={isSpacePressed}
            isPanning={isPanning}
            onSelect={(shiftKey) => setSelectedElementId(el.id, { additive: shiftKey })}
            onDragMove={handleDragMove}
            onResizeCommit={handleResizeCommit}
            onRestoreAspect={handleRestoreAspect}
            onRotate={handleRotate}
            onToggleClipToKeycaps={handleToggleClipToKeycaps}
            onRestrictToSelectedKeycaps={handleRestrictToSelectedKeycaps}
            onClearKeycapRestriction={handleClearKeycapRestriction}
            selectedKeycapCount={selectedKeycapIds.length}
          />
        )
      })}
    </div>
  )
}
