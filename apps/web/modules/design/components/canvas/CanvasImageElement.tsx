"use client"

import { useRef, useState, useCallback, useMemo } from "react"
import type { CanvasImageElement as CanvasImageElementData } from "@/modules/design/store/designUiStore"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { KEY_RADIUS_BASE, KEYCAP_GAP, type KeyDef } from "./KeycapNode"
import { type ResizeCorner, type ResizeEdge, type ResizeHandle, computeResizePatch, normalizeAngleDeg } from "./imageElementUtils"
import { ResetRotationIcon, RestoreAspectIcon, LockAspectIcon } from "./ImageControlIcons"

const _ART_PAD = 28
const SELECTION_BORDER = "var(--design-selection-border)"
const SELECTION_SURFACE = "var(--background)"
const SELECTION_ON = "var(--primary-foreground)"

export interface CanvasImageElementProps {
  element: CanvasImageElementData
  isSelected: boolean
  zoom: number
  /** 空格键是否按下（按下时左键拖拽应移动画布而非图片） */
  isSpacePressed?: boolean
  /** 是否正在平移画布（决定光标样式） */
  isPanning?: boolean
  onSelect: () => void
  onDragMove: (id: string, dx: number, dy: number) => void
  /** 缩放结束时提交绝对坐标和尺寸（替代逐帧 delta） */
  onResizeCommit: (id: string, x: number, y: number, w: number, h: number) => void
  onRestoreAspect: (id: string, w: number, h: number) => void
  onRotate: (id: string, deg: number) => void
  onToggleClipToKeycaps: (id: string) => void
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

  // zoom 始终通过 ref 读取，避免 callback stale closure
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  // 通过 ref 向 callback 传递最新值，避免 stale closure
  const isClippedRef = useRef(!!element.clipToKeycaps)
  isClippedRef.current = !!element.clipToKeycaps
  const elementIdRef = useRef(element.id)
  elementIdRef.current = element.id

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  // ─── 实时预览 state + ref（ref 供 useCallback 内读取最新值）
  const liveOffsetRef = useRef<{ dx: number; dy: number } | null>(null)
  const liveResizeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const liveRotationRef = useRef<number | null>(null)

  const [liveOffset, setLiveOffset] = useState<{ dx: number; dy: number } | null>(null)
  const [liveResize, setLiveResize] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [liveRotation, setLiveRotation] = useState<number | null>(null)

  // 同步 ref 与 state（渲染期执行，始终最新）
  liveOffsetRef.current = liveOffset
  liveResizeRef.current = liveResize
  liveRotationRef.current = liveRotation

  // ─── 显示值：使用本地预览覆盖 store 中的值
  let dispX = element.x, dispY = element.y
  let dispW = element.width, dispH = element.height
  let dispRot = element.rotation ?? 0
  if (liveOffset) { dispX = element.x + liveOffset.dx; dispY = element.y + liveOffset.dy }
  if (liveResize) { dispX = liveResize.x; dispY = liveResize.y; dispW = liveResize.w; dispH = liveResize.h }
  if (liveRotation !== null) { dispRot = liveRotation }

  // clipToKeycapId：在 HTML 层以 CSS clip-path 裁剪到单个键帽形状
  const isClippedToAllKeycaps = !!element.clipToKeycaps
  const hasKeycapClip = !!element.clipToKeycapId && (element.clipToKeycaps ?? true)
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
  // 用 ref 存储最新的 isSpacePressed，供 callback 读取而不产生 stale closure
  const isSpacePressedRef = useRef(isSpacePressed)
  isSpacePressedRef.current = isSpacePressed

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // 中键或空格+左键：交给画布平移处理，不拦截
      if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) return
      if (element.locked) return
      e.stopPropagation()
      onSelect()
      dragStart.current = { mx: e.clientX, my: e.clientY }
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
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
      // clip-to-keycaps 模式：同步写入 store 的实时偏移，让 SVG 层跟手
      if (isClippedRef.current) {
        useDesignUIStore.getState().setLiveDragOverride(elementIdRef.current, dx, dy)
      }
    },
    [setLiveOffset],
  )

  const handlePointerUp = useCallback(() => {
    const offset = liveOffsetRef.current
    if (offset && (Math.abs(offset.dx) > 0.5 || Math.abs(offset.dy) > 0.5)) {
      onDragMove(element.id, offset.dx, offset.dy)
    }
    dragStart.current = null
    liveOffsetRef.current = null
    setLiveOffset(null)
    // 清除 clip-to-keycaps 的实时偏移（提交后由 store 坐标接管）
    if (isClippedRef.current) {
      useDesignUIStore.getState().clearLiveDragOverride(elementIdRef.current)
    }
  }, [element.id, onDragMove, setLiveOffset])

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
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
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
    [setLiveResize],
  )

  const handleResizePointerUp = useCallback(() => {
    const lr = liveResizeRef.current
    if (lr) {
      onResizeCommit(element.id, lr.x, lr.y, lr.w, lr.h)
    }
    resizeDragStart.current = null
    liveResizeRef.current = null
    setLiveResize(null)
  }, [element.id, onResizeCommit, setLiveResize])

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
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
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
    [setLiveRotation],
  )

  const handleRotatePointerUp = useCallback(() => {
    const rot = liveRotationRef.current
    if (rot !== null) {
      onRotate(element.id, rot)
    }
    rotateDragStart.current = null
    liveRotationRef.current = null
    setLiveRotation(null)
  }, [element.id, onRotate, setLiveRotation])

  const HANDLE_SIZE = 7 / zoom
  const EDGE_THICK = HANDLE_SIZE
  const EDGE_LONG = HANDLE_SIZE * 2
  const ROTATE_LINE = 22 / zoom
  const ROTATE_R = 5 / zoom
  const ICON_SIZE = 14 / zoom

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
        cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : element.locked ? "default" : "move",
        userSelect: "none",
        touchAction: "none",
        transform: hasKeycapClip ? undefined : `rotate(${dispRot}deg)`,
        transformOrigin: "center",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={(e) => {
        // 中键或空格+左键：不拦截，让画布平移处理
        if (e.button === 1 || (e.button === 0 && isSpacePressedRef.current)) return
        e.stopPropagation()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 图片渲染 */}
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
        <div
          style={{
            width: "100%",
            height: "100%",
            border: `${1.5 / zoom}px dashed color-mix(in oklch, ${SELECTION_BORDER} 70%, transparent)`,
            borderRadius: 2 / zoom,
            boxSizing: "border-box",
            pointerEvents: "none",
            background: "transparent",
          }}
        />
      )}

      {/* 选中态：轮廓 + 控件 */}
      {isSelected && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              border: `${1.5 / zoom}px solid ${SELECTION_BORDER}`,
              pointerEvents: "none",
            }}
          />

          {/* 工具栏：flex 横排居中悬浮于图片上方 */}
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: HANDLE_SIZE / 2 + 2 / zoom,
              display: "flex",
              alignItems: "center",
              gap: 4 / zoom,
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
          >
            {/* 裁切到键帽 */}
            {!hasKeycapClip && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onToggleClipToKeycaps(element.id) }}
                title={isClippedToAllKeycaps ? "已裁剪到键帽（点击切换为自由浮层）" : "自由浮层（点击裁剪到键帽形状）"}
                style={{
                  width: 24 / zoom, height: 24 / zoom,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isClippedToAllKeycaps ? SELECTION_BORDER : SELECTION_SURFACE,
                  border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                  borderRadius: 4 / zoom,
                  cursor: "pointer", padding: 0,
                  color: isClippedToAllKeycaps ? SELECTION_ON : SELECTION_BORDER,
                  pointerEvents: "auto", flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 12 12" width={ICON_SIZE} height={ICON_SIZE} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1"   y="1"   width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                  <rect x="6.8" y="1"   width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                  <rect x="1"   y="6.8" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                  <rect x="6.8" y="6.8" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                </svg>
              </button>
            )}

            {/* 分隔线 */}
            {!hasKeycapClip && (
              <div style={{ width: 1 / zoom, height: 14 / zoom, background: SELECTION_BORDER, opacity: 0.3, flexShrink: 0 }} />
            )}

            {/* 重置旋转（仅旋转不为 0 时显示） */}
            {!hasKeycapClip && dispRot !== 0 && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onRotate(element.id, 0) }}
                title="恢复水平（重置旋转）"
                style={{
                  width: 24 / zoom, height: 24 / zoom,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: SELECTION_SURFACE,
                  border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                  borderRadius: 4 / zoom,
                  cursor: "pointer", padding: 0,
                  color: SELECTION_BORDER,
                  pointerEvents: "auto", flexShrink: 0,
                }}
              >
                <ResetRotationIcon size={ICON_SIZE} />
              </button>
            )}

            {/* 恢复原始比例 */}
            {naturalSize && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  const newH = Math.round(dispW * (naturalSize.h / naturalSize.w))
                  onRestoreAspect(element.id, dispW, newH)
                }}
                title="恢复原始比例"
                style={{
                  width: 24 / zoom, height: 24 / zoom,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: SELECTION_SURFACE,
                  border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                  borderRadius: 4 / zoom,
                  cursor: "pointer", padding: 0,
                  color: SELECTION_BORDER,
                  pointerEvents: "auto", flexShrink: 0,
                }}
              >
                <RestoreAspectIcon size={ICON_SIZE} />
              </button>
            )}

            {/* 锁定宽高比 */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setLockAspect((v) => !v) }}
              title={lockAspect ? "等比缩放（点击切换为自由缩放）" : "自由缩放（点击切换为等比缩放）"}
              style={{
                width: 24 / zoom, height: 24 / zoom,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: lockAspect ? SELECTION_BORDER : SELECTION_SURFACE,
                border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                borderRadius: 4 / zoom,
                cursor: "pointer", padding: 0,
                color: lockAspect ? SELECTION_ON : SELECTION_BORDER,
                pointerEvents: "auto", flexShrink: 0,
              }}
            >
              <LockAspectIcon size={ICON_SIZE} locked={lockAspect} />
            </button>
          </div>

          {/* 旋转手柄（底边中心下方） */}
          {!hasKeycapClip && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: `calc(100% + ${HANDLE_SIZE / 2}px)`,
                  width: 1 / zoom,
                  height: ROTATE_LINE,
                  background: SELECTION_BORDER,
                  transform: "translateX(-50%)",
                  pointerEvents: "none",
                }}
              />
              <div
                onPointerDown={handleRotatePointerDown}
                onPointerMove={handleRotatePointerMove}
                onPointerUp={handleRotatePointerUp}
                title="拖拽旋转"
                style={{
                  position: "absolute",
                  left: "50%",
                  top: `calc(100% + ${HANDLE_SIZE / 2 + ROTATE_LINE + ROTATE_R}px)`,
                  width: ROTATE_R * 2,
                  height: ROTATE_R * 2,
                  transform: "translate(-50%, -50%)",
                  background: SELECTION_SURFACE,
                  border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                  borderRadius: "50%",
                  cursor: "grab",
                }}
              />
            </>
          )}

          {/* 4 个角点缩放手柄 */}
          {(["se", "sw", "ne", "nw"] as ResizeCorner[]).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => handleResizePointerDown(corner, e)}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              style={{
                position: "absolute",
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: SELECTION_SURFACE,
                border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                borderRadius: 1 / zoom,
                cursor: corner === "se" || corner === "nw" ? "nwse-resize" : "nesw-resize",
                ...(corner === "se" && { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 }),
                ...(corner === "sw" && { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 }),
                ...(corner === "ne" && { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }),
                ...(corner === "nw" && { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 }),
              }}
            />
          ))}

          {/* 4 个边中点单轴缩放手柄 */}
          {(["n", "s", "e", "w"] as ResizeEdge[]).map((edge) => {
            const isHorizontal = edge === "e" || edge === "w"
            return (
              <div
                key={edge}
                onPointerDown={(e) => handleResizePointerDown(edge, e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                style={{
                  position: "absolute",
                  width: isHorizontal ? EDGE_THICK : EDGE_LONG,
                  height: isHorizontal ? EDGE_LONG : EDGE_THICK,
                  background: SELECTION_SURFACE,
                  border: `${1 / zoom}px solid ${SELECTION_BORDER}`,
                  borderRadius: EDGE_THICK / 2,
                  cursor: isHorizontal ? "ew-resize" : "ns-resize",
                  ...(edge === "n" && { top: -EDGE_THICK / 2, left: "50%", transform: "translateX(-50%)" }),
                  ...(edge === "s" && { bottom: -EDGE_THICK / 2, left: "50%", transform: "translateX(-50%)" }),
                  ...(edge === "e" && { right: -EDGE_THICK / 2, top: "50%", transform: "translateY(-50%)" }),
                  ...(edge === "w" && { left: -EDGE_THICK / 2, top: "50%", transform: "translateY(-50%)" }),
                }}
              />
            )
          })}
        </>
      )}
    </div>
  )
}
