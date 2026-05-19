"use client"

import { useRef, useState, useCallback, useMemo } from "react"
import type { CanvasImageElement } from "@/modules/design/store/designUiStore"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { KEY_RADIUS_BASE, KEYCAP_GAP, type KeyDef } from "./KeycapNode"

const _ART_PAD = 28

// ─── 缩放句柄类型 ──────────────────────────────────────
export type ResizeCorner = "se" | "sw" | "ne" | "nw"
export type ResizeEdge = "n" | "s" | "e" | "w"
export type ResizeHandle = ResizeCorner | ResizeEdge

export interface ImageElementProps {
  element: CanvasImageElement
  isSelected: boolean
  zoom: number
  onSelect: () => void
  onDragMove: (id: string, dx: number, dy: number) => void
  /** 缩放结束时提交绝对坐标和尺寸（替代逐帧 delta） */
  onResizeCommit: (id: string, x: number, y: number, w: number, h: number) => void
  onRestoreAspect: (id: string, w: number, h: number) => void
  onRotate: (id: string, deg: number) => void
  onToggleClipToKeycaps: (id: string) => void
}

export function ImageElement({
  element,
  isSelected,
  zoom,
  onSelect,
  onDragMove,
  onResizeCommit,
  onRestoreAspect,
  onRotate,
  onToggleClipToKeycaps,
}: ImageElementProps) {
  const templateId = useDesignUIStore((s) => s.templateId)
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
      // 用本地 state 预览，不写 store
      liveOffsetRef.current = { dx, dy }
      setLiveOffset({ dx, dy })
      // clip-to-keycaps 模式：同步写入 store 的实时偏移，让 SVG 层跟手
      if (isClippedRef.current) {
        useDesignUIStore.getState().setLiveDragOverride(elementIdRef.current, dx, dy)
      }
    },
    // setLiveOffset 是 useState setter，React 保证引用稳定
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
      let dx = (e.clientX - mx) / zoomRef.current
      let dy = (e.clientY - my) / zoomRef.current

      const isCorner = handle === "se" || handle === "sw" || handle === "ne" || handle === "nw"
      if (isCorner && lockAspectRef.current) {
        const aspect = startW / startH
        const dw = handle === "sw" || handle === "nw" ? -dx : dx
        const dh = handle === "ne" || handle === "nw" ? -dy : dy
        let newDw: number, newDh: number
        if (Math.abs(dw) >= Math.abs(dh * aspect)) {
          newDw = dw; newDh = dw / aspect
        } else {
          newDh = dh; newDw = dh * aspect
        }
        dx = handle === "sw" || handle === "nw" ? -newDw : newDw
        dy = handle === "ne" || handle === "nw" ? -newDh : newDh
      }

      const MIN = 20
      let nx = startX, ny = startY, nw = startW, nh = startH
      if (handle === "se") { nw = Math.max(MIN, startW + dx); nh = Math.max(MIN, startH + dy) }
      else if (handle === "sw") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw; nh = Math.max(MIN, startH + dy) }
      else if (handle === "ne") { nw = Math.max(MIN, startW + dx); nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
      else if (handle === "nw") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw; nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
      else if (handle === "s") { nh = Math.max(MIN, startH + dy) }
      else if (handle === "n") { nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
      else if (handle === "e") { nw = Math.max(MIN, startW + dx) }
      else if (handle === "w") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw }

      const patch = { x: nx, y: ny, w: nw, h: nh }
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
      const newRotation = Math.round(((startRotation + deltaDeg) % 360 + 360) % 360)
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
        cursor: element.locked ? "default" : "move",
        userSelect: "none",
        touchAction: "none",
        transform: hasKeycapClip ? undefined : `rotate(${dispRot}deg)`,
        transformOrigin: "center",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 图片渲染 */}
      {!isClippedToAllKeycaps ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={element.src}
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
            border: `${1.5 / zoom}px dashed rgba(99,179,237,0.7)`,
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
              border: `${1.5 / zoom}px solid #3b82f6`,
              pointerEvents: "none",
            }}
          />

          {/* Clip to Keycaps 切换按钮 */}
          {!hasKeycapClip && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onToggleClipToKeycaps(element.id) }}
              title={isClippedToAllKeycaps ? "已裁剪到键帽（点击切换为自由浮层）" : "自由浮层（点击裁剪到键帽形状）"}
              style={{
                position: "absolute",
                top: -(26 / zoom + HANDLE_SIZE / 2),
                right: 3 * (24 / zoom + 4 / zoom) - HANDLE_SIZE / 2,
                width: 24 / zoom,
                height: 24 / zoom,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isClippedToAllKeycaps ? "#3b82f6" : "white",
                border: `${1 / zoom}px solid #3b82f6`,
                borderRadius: 4 / zoom,
                cursor: "pointer",
                padding: 0,
                color: isClippedToAllKeycaps ? "white" : "#3b82f6",
              }}
            >
              <svg viewBox="0 0 12 12" width={14 / zoom} height={14 / zoom} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="1" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                <rect x="6.8" y="1" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                <rect x="1" y="6.8" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
                <rect x="6.8" y="6.8" width="4.2" height="4.2" rx="0.8" fill={isClippedToAllKeycaps ? "currentColor" : "none"} opacity={isClippedToAllKeycaps ? 0.3 : 1} />
              </svg>
            </button>
          )}

          {/* 重置旋转按钮 */}
          {!hasKeycapClip && dispRot !== 0 && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onRotate(element.id, 0) }}
              title="恢复水平（重置旋转）"
              style={{
                position: "absolute",
                top: -(26 / zoom + HANDLE_SIZE / 2),
                right: 2 * (24 / zoom + 4 / zoom) - HANDLE_SIZE / 2,
                width: 24 / zoom,
                height: 24 / zoom,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "white",
                border: `${1 / zoom}px solid #3b82f6`,
                borderRadius: 4 / zoom,
                cursor: "pointer",
                padding: 0,
                color: "#3b82f6",
              }}
            >
              <svg viewBox="0 0 12 12" width={14 / zoom} height={14 / zoom} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 6a4 4 0 1 0 .8-2.4" />
                <path d="M2 2v2.5h2.5" />
              </svg>
            </button>
          )}

          {/* 恢复原始比例按钮 */}
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
                position: "absolute",
                top: -(26 / zoom + HANDLE_SIZE / 2),
                right: 24 / zoom + 4 / zoom - HANDLE_SIZE / 2,
                width: 24 / zoom,
                height: 24 / zoom,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "white",
                border: `${1 / zoom}px solid #3b82f6`,
                borderRadius: 4 / zoom,
                cursor: "pointer",
                padding: 0,
                color: "#3b82f6",
              }}
            >
              <svg viewBox="0 0 12 12" width={14 / zoom} height={14 / zoom} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4.5V1h3.5" />
                <path d="M1 1l3 3" />
                <path d="M11 7.5V11H7.5" />
                <path d="M11 11l-3-3" />
              </svg>
            </button>
          )}

          {/* 等比缩放切换按钮 */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setLockAspect((v) => !v) }}
            title={lockAspect ? "等比缩放（点击切换为自由缩放）" : "自由缩放（点击切换为等比缩放）"}
            style={{
              position: "absolute",
              top: -(26 / zoom + HANDLE_SIZE / 2),
              right: -HANDLE_SIZE / 2,
              width: 24 / zoom,
              height: 24 / zoom,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: lockAspect ? "#3b82f6" : "white",
              border: `${1 / zoom}px solid #3b82f6`,
              borderRadius: 4 / zoom,
              cursor: "pointer",
              padding: 0,
              color: lockAspect ? "white" : "#3b82f6",
            }}
          >
            <svg viewBox="0 0 12 12" width={14 / zoom} height={14 / zoom} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              {lockAspect ? (
                <>
                  <rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" opacity={0.25} />
                  <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
                  <path d="M4 5.5V3.5a2 2 0 0 1 4 0v2" />
                </>
              ) : (
                <>
                  <rect x="2" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" opacity={0.15} />
                  <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
                  <path d="M4 5.5V3.5a2 2 0 0 1 4 0" />
                </>
              )}
            </svg>
          </button>

          {/* 旋转手柄 */}
          {!hasKeycapClip && (
            <>
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -(HANDLE_SIZE / 2 + ROTATE_LINE),
                  width: 1 / zoom,
                  height: ROTATE_LINE,
                  background: "#3b82f6",
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
                  top: -(HANDLE_SIZE / 2 + ROTATE_LINE + ROTATE_R),
                  width: ROTATE_R * 2,
                  height: ROTATE_R * 2,
                  transform: "translate(-50%, -50%)",
                  background: "white",
                  border: `${1 / zoom}px solid #3b82f6`,
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
                background: "white",
                border: `${1 / zoom}px solid #3b82f6`,
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
                  background: "white",
                  border: `${1 / zoom}px solid #3b82f6`,
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
