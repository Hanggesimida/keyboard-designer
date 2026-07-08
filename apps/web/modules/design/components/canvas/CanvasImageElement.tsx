"use client"

import { useRef, useState, useCallback, useMemo } from "react"
import type { CanvasImageElement as CanvasImageElementData } from "@/modules/design/store/designUiStore"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { KEY_RADIUS_BASE, KEYCAP_GAP, type KeyDef } from "./KeycapNode"
import {
  type ResizeHandle,
  computeResizePatch,
  getImagePointerMode,
  normalizeAngleDeg,
} from "./imageElementUtils"
import { ClippedImagePlaceholder, ImageSelectionChrome } from "./ImageSelectionChrome"

const _ART_PAD = 28

export interface CanvasImageElementProps {
  element: CanvasImageElementData
  isSelected: boolean
  zoom: number
  /** 空格键是否按下（按下时左键拖拽应移动画布而非图片） */
  isSpacePressed?: boolean
  /** 是否正在平移画布（决定光标样式） */
  isPanning?: boolean
  onSelect: (shiftKey: boolean) => void
  onDragMove: (id: string, dx: number, dy: number) => void
  /** 缩放结束时提交绝对坐标和尺寸（替代逐帧 delta） */
  onResizeCommit: (id: string, x: number, y: number, w: number, h: number) => void
  onRestoreAspect: (id: string, w: number, h: number) => void
  onRotate: (id: string, deg: number) => void
  onToggleClipToKeycaps: (id: string) => void
  onRestrictToSelectedKeycaps?: (id: string) => void
  onClearKeycapRestriction?: (id: string) => void
  selectedKeycapCount?: number
}

export function CanvasImageElement({
  element,
  isSelected,
  zoom,
  isSpacePressed = false,
  isPanning = false,
  onSelect,
  onDragMove,
  onResizeCommit,
  onRestoreAspect,
  onRotate,
  onToggleClipToKeycaps,
  onRestrictToSelectedKeycaps,
  onClearKeycapRestriction,
  selectedKeycapCount = 0,
}: CanvasImageElementProps) {
  const templateId = useDesignUIStore((s) => s.templateId)
  const src = useDesignUIStore((s) => s.assetMap[element.assetId] ?? "")
  const keycapBoundsMap = useMemo(() => {
    const layout = getLayoutData(templateId)
    const unit = layout.baseUnit
    const map: Record<string, { x: number; y: number; w: number; h: number }> = {}
    for (const row of layout.rows) {
      for (const key of row.keys as KeyDef[]) {
        map[key.keyId] = {
          x: _ART_PAD + key.x * unit + KEYCAP_GAP / 2,
          y: _ART_PAD + key.y * unit + KEYCAP_GAP / 2,
          w: key.w * unit - KEYCAP_GAP,
          h: key.h * unit - KEYCAP_GAP,
        }
      }
    }
    return map
  }, [templateId])

  const [lockAspect, setLockAspect] = useState(true)
  const lockAspectRef = useRef(lockAspect)
  lockAspectRef.current = lockAspect

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const isClippedRef = useRef(!!element.clipToKeycaps)
  isClippedRef.current = !!element.clipToKeycaps
  const elementIdRef = useRef(element.id)
  elementIdRef.current = element.id

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  const liveOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const liveResizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const liveRotationRef = useRef<number | null>(null)

  const [liveOffset, setLiveOffset] = useState<{ dx: number; dy: number } | null>(null)
  const [liveResize, setLiveResize] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [liveRotation, setLiveRotation] = useState<number | null>(null)

  liveOffsetRef.current = liveOffset
  liveResizeRef.current = liveResize
  liveRotationRef.current = liveRotation

  let dispX = element.x, dispY = element.y
  let dispW = element.width, dispH = element.height
  let dispRot = element.rotation ?? 0
  if (liveOffset) { dispX = element.x + liveOffset.dx; dispY = element.y + liveOffset.dy }
  if (liveResize) { dispX = liveResize.x; dispY = liveResize.y; dispW = liveResize.w; dispH = liveResize.h }
  if (liveRotation !== null) { dispRot = liveRotation }

  const isClippedToAllKeycaps = !!element.clipToKeycaps
  const hasExplicitKeycapRestriction = !!(element.clipToKeycapIds && element.clipToKeycapIds.length > 0)
  const hasKeycapClip = !!element.clipToKeycapId && (element.clipToKeycaps ?? true)
  const pointerMode = getImagePointerMode(element, isSelected)
  const isFreePointer = pointerMode === "free"
  let keycapClipPath: string | undefined
  if (hasKeycapClip && element.clipToKeycapId) {
    const bounds = keycapBoundsMap[element.clipToKeycapId]
    if (bounds) {
      const insetTop = bounds.y - dispY
      const insetLeft = bounds.x - dispX
      const insetRight = (dispX + dispW) - (bounds.x + bounds.w)
      const insetBottom = (dispY + dispH) - (bounds.y + bounds.h)
      keycapClipPath = `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round ${KEY_RADIUS_BASE}px)`
    }
  }

  // ─── 拖拽移动 ──────────────────────────────────────────
  const dragStart = useRef<{ mx: number; my: number } | null>(null)
  const isSpacePressedRef = useRef(isSpacePressed)
  isSpacePressedRef.current = isSpacePressed

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) return
      if (element.locked) return
      e.stopPropagation()
      onSelect(e.shiftKey)
      dragStart.current = { mx: e.clientX, my: e.clientY }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [element.locked, onSelect],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStart.current) return
      const dx = (e.clientX - dragStart.current.mx) / zoomRef.current
      const dy = (e.clientY - dragStart.current.my) / zoomRef.current
      liveOffsetRef.current = { dx, dy }
      setLiveOffset({ dx, dy })
      if (isClippedRef.current) {
        useDesignUIStore.getState().setLiveDragOverride(elementIdRef.current, dx, dy)
      }
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    const offset = liveOffsetRef.current
    if (offset && (Math.abs(offset.dx) > 0.5 || Math.abs(offset.dy) > 0.5)) {
      onDragMove(element.id, offset.dx, offset.dy)
    }
    dragStart.current = null
    liveOffsetRef.current = null
    setLiveOffset(null)
    if (isClippedRef.current) {
      useDesignUIStore.getState().clearLiveDragOverride(elementIdRef.current)
    }
  }, [element.id, onDragMove])

  // ─── 缩放手柄 ──────────────────────────────────────────
  const resizeDragStart = useRef<{
    mx: number; my: number; handle: ResizeHandle
    startX: number; startY: number; startW: number; startH: number
  } | null>(null)

  const handleResizePointerDown = useCallback(
    (handle: ResizeHandle, e: React.PointerEvent) => {
      e.stopPropagation()
      resizeDragStart.current = {
        mx: e.clientX, my: e.clientY, handle,
        startX: element.x, startY: element.y,
        startW: element.width, startH: element.height,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [element.x, element.y, element.width, element.height],
  )

  const handleResizePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeDragStart.current) return
      const { mx, my, handle, startX, startY, startW, startH } = resizeDragStart.current
      const dx = (e.clientX - mx) / zoomRef.current
      const dy = (e.clientY - my) / zoomRef.current
      const patch = computeResizePatch(handle, dx, dy, startX, startY, startW, startH, lockAspectRef.current, 20)
      liveResizeRef.current = patch
      setLiveResize(patch)
    },
    [],
  )

  const handleResizePointerUp = useCallback(() => {
    const lr = liveResizeRef.current
    if (lr) onResizeCommit(element.id, lr.x, lr.y, lr.w, lr.h)
    resizeDragStart.current = null
    liveResizeRef.current = null
    setLiveResize(null)
  }, [element.id, onResizeCommit])

  // ─── 旋转手柄 ──────────────────────────────────────────
  const rotateDragStart = useRef<{
    centerX: number
    centerY: number
    startAngle: number
    startRotation: number
  } | null>(null)

  const handleRotatePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      if (!elementRef.current) return
      const rect = elementRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      rotateDragStart.current = {
        centerX,
        centerY,
        startAngle: Math.atan2(e.clientY - centerY, e.clientX - centerX),
        startRotation: element.rotation ?? 0,
      }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [element.rotation],
  )

  const handleRotatePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!rotateDragStart.current) return
      const { centerX, centerY, startAngle, startRotation } = rotateDragStart.current
      const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
      const deltaDeg = (currentAngle - startAngle) * (180 / Math.PI)
      const newRotation = normalizeAngleDeg(startRotation, deltaDeg)
      liveRotationRef.current = newRotation
      setLiveRotation(newRotation)
    },
    [],
  )

  const handleRotatePointerUp = useCallback(() => {
    const rot = liveRotationRef.current
    if (rot !== null) onRotate(element.id, rot)
    rotateDragStart.current = null
    liveRotationRef.current = null
    setLiveRotation(null)
  }, [element.id, onRotate])

  return (
    <div
      ref={elementRef}
      data-canvas-element-id={element.id}
      style={{
        position: "absolute",
        left: dispX,
        top: dispY,
        width: dispW,
        height: dispH,
        opacity: isClippedToAllKeycaps ? 1 : element.opacity,
        zIndex: isSelected ? 1 : 0,
        cursor: isFreePointer
          ? isPanning ? "grabbing" : isSpacePressed ? "grab" : element.locked ? "default" : "move"
          : undefined,
        userSelect: "none",
        touchAction: "none",
        pointerEvents: isFreePointer ? "auto" : "none",
        transform: hasKeycapClip ? undefined : `rotate(${dispRot}deg)`,
        transformOrigin: "center",
      }}
      {...(isFreePointer
        ? {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onMouseDown: (e: React.MouseEvent) => {
              if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) return
              e.stopPropagation()
            },
            onClick: (e: React.MouseEvent) => e.stopPropagation(),
          }
        : {})}
    >
      {!isClippedToAllKeycaps ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "fill",
            display: "block",
            pointerEvents: "none",
            clipPath: keycapClipPath,
          }}
        />
      ) : (
        <ClippedImagePlaceholder zoom={zoom} />
      )}

      {isSelected && (
        <ImageSelectionChrome
          zoom={zoom}
          width={dispW}
          height={dispH}
          rotation={dispRot}
          hasKeycapClip={hasKeycapClip}
          hasExplicitKeycapRestriction={hasExplicitKeycapRestriction}
          clipToKeycapIdsCount={element.clipToKeycapIds?.length ?? 0}
          isClippedToAllKeycaps={isClippedToAllKeycaps}
          selectedKeycapCount={selectedKeycapCount}
          lockAspect={lockAspect}
          naturalSize={naturalSize}
          onToggleLockAspect={() => setLockAspect((v) => !v)}
          onRestoreAspect={() => {
            if (!naturalSize) return
            onRestoreAspect(element.id, dispW, Math.round(dispW * (naturalSize.h / naturalSize.w)))
          }}
          onResetRotation={() => onRotate(element.id, 0)}
          onToggleClipToKeycaps={() => onToggleClipToKeycaps(element.id)}
          onRestrictToSelectedKeycaps={() => onRestrictToSelectedKeycaps?.(element.id)}
          onClearKeycapRestriction={() => onClearKeycapRestriction?.(element.id)}
          onResizePointerDown={handleResizePointerDown}
          onResizePointerMove={handleResizePointerMove}
          onResizePointerUp={handleResizePointerUp}
          onRotatePointerDown={handleRotatePointerDown}
          onRotatePointerMove={handleRotatePointerMove}
          onRotatePointerUp={handleRotatePointerUp}
        />
      )}
    </div>
  )
}
