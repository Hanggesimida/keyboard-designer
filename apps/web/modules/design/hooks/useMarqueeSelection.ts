"use client"

import { useCallback, useRef, useState } from "react"
import type { RefObject } from "react"
import type { KeyDef } from "@/modules/design/types/design"
import type { Viewport } from "@/modules/design/hooks/useViewport"

const MARQUEE_DRAG_THRESHOLD = 3

interface MarqueeState {
  startX: number
  startY: number
  endX: number
  endY: number
  /** 是否叠加到现有选中（Shift+框选） */
  additive: boolean
}

export interface MarqueePanHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
  onMouseLeave: () => void
}

export interface UseMarqueeSelectionParams {
  containerRef: RefObject<HTMLDivElement | null>
  viewport: Viewport
  keys: KeyDef[]
  unit: number
  artPad: number
  isSpacePressed: boolean
  isPanning: boolean
  selectedKeycapIds: string[]
  setSelectedKeycapIds: (ids: string[], options?: { additive?: boolean }) => void
  clearSelection: () => void
  panHandlers: MarqueePanHandlers
  /** 禁用框选和所有鼠标交互，模态框打开时传 true */
  disabled?: boolean
}

export interface MarqueeOverlayRect {
  left: number
  top: number
  width: number
  height: number
}

function getKeycapsInMarquee(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  viewport: Viewport,
  keys: KeyDef[],
  unit: number,
  artPad: number,
): string[] {
  const ax1 = (Math.min(startX, endX) - viewport.x) / viewport.zoom - artPad
  const ay1 = (Math.min(startY, endY) - viewport.y) / viewport.zoom - artPad
  const ax2 = (Math.max(startX, endX) - viewport.x) / viewport.zoom - artPad
  const ay2 = (Math.max(startY, endY) - viewport.y) / viewport.zoom - artPad

  return keys
    .filter((key) => {
      const kx1 = key.x * unit
      const ky1 = key.y * unit
      const kx2 = (key.x + key.w) * unit
      const ky2 = (key.y + key.h) * unit
      return kx1 < ax2 && kx2 > ax1 && ky1 < ay2 && ky2 > ay1
    })
    .map((key) => key.keyId)
}

/**
 * 画布空白区域框选：mousedown / move / up、拖拽阈值、Shift 合并选中、与 viewport 的矩形相交计算。
 */
export function useMarqueeSelection({
  containerRef,
  viewport,
  keys,
  unit,
  artPad,
  isSpacePressed,
  isPanning,
  selectedKeycapIds,
  setSelectedKeycapIds,
  clearSelection,
  panHandlers,
  disabled = false,
}: UseMarqueeSelectionParams) {
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const marqueeRef = useRef<MarqueeState | null>(null)
  marqueeRef.current = marquee
  const wasDraggedRef = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      panHandlers.onMouseDown(e)

      if (e.button !== 0 || isSpacePressed) return

      const isKeycapTarget = !!(e.target as Element).closest("[data-keycap]")
      if (isKeycapTarget) return
      // 点击画布元素（图片/贴纸）时不启动框选
      const isCanvasElementTarget = !!(e.target as Element).closest("[data-canvas-element-id]")
      if (isCanvasElementTarget) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      wasDraggedRef.current = false
      setMarquee({ startX: sx, startY: sy, endX: sx, endY: sy, additive: e.shiftKey })
    },
    [containerRef, disabled, isSpacePressed, panHandlers],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      panHandlers.onMouseMove(e)

      if (!marqueeRef.current) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const ex = e.clientX - rect.left
      const ey = e.clientY - rect.top
      const dx = Math.abs(ex - marqueeRef.current.startX)
      const dy = Math.abs(ey - marqueeRef.current.startY)
      if (dx > MARQUEE_DRAG_THRESHOLD || dy > MARQUEE_DRAG_THRESHOLD) {
        wasDraggedRef.current = true
      }
      setMarquee((prev) => (prev ? { ...prev, endX: ex, endY: ey } : null))
    },
    [containerRef, disabled, panHandlers],
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      void e
      if (disabled) return
      panHandlers.onMouseUp()

      const current = marqueeRef.current
      if (current && wasDraggedRef.current) {
        const inRect = getKeycapsInMarquee(
          current.startX,
          current.startY,
          current.endX,
          current.endY,
          viewport,
          keys,
          unit,
          artPad,
        )
        if (current.additive) {
          const merged = Array.from(new Set([...selectedKeycapIds, ...inRect]))
          setSelectedKeycapIds(merged, { additive: true })
        } else {
          setSelectedKeycapIds(inRect)
        }
      }
      setMarquee(null)
    },
    [
      artPad,
      disabled,
      keys,
      panHandlers,
      selectedKeycapIds,
      setSelectedKeycapIds,
      unit,
      viewport,
    ],
  )

  const handleMouseLeave = useCallback(() => {
    if (disabled) return
    panHandlers.onMouseLeave()
    setMarquee(null)
  }, [disabled, panHandlers])

  const handleClick = useCallback(() => {
    if (disabled) return
    if (isPanning || isSpacePressed) return
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false
      return
    }
    clearSelection()
  }, [clearSelection, disabled, isPanning, isSpacePressed])

  const marqueeW = marquee ? Math.abs(marquee.endX - marquee.startX) : 0
  const marqueeH = marquee ? Math.abs(marquee.endY - marquee.startY) : 0
  const showMarquee =
    marquee !== null &&
    (marqueeW > MARQUEE_DRAG_THRESHOLD || marqueeH > MARQUEE_DRAG_THRESHOLD)

  const marqueeOverlay: MarqueeOverlayRect | null =
    showMarquee && marquee
      ? {
          left: Math.min(marquee.startX, marquee.endX),
          top: Math.min(marquee.startY, marquee.endY),
          width: marqueeW,
          height: marqueeH,
        }
      : null

  return {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    marqueeOverlay,
  }
}
