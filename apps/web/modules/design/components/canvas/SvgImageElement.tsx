"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { clamp } from "@/modules/design/lib/design/keycapGeometry"

/** 键帽编辑器内图片视图（坐标相对键帽底座左上角，SVG 单位） */
export interface KeycapEditorImage {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  opacity: number
  rotation?: number
}

// ─── 单键帽模态 viewBox 内边距（与 KeycapEditorModal 保持一致） ──
export const MODAL_VIEW_INSET = 16

// ─── 缩放句柄类型 ──────────────────────────────────────
export type ResizeHandle = "se" | "sw" | "ne" | "nw" | "n" | "s" | "e" | "w"

// ─── 每张图片的实时变换预览 ────────────────────────────
interface LivePatch {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
}

// ─── 图片控件 HTML 浮层（与 canvas-element-layer 一致，避免 SVG 缩放导致图标发糊） ──
const CTRL_BTN = 24
const CTRL_ICON = 14
const CTRL_HANDLE = 7
const CTRL_GAP = 4

interface KeycapImageControlOverlayProps {
  left: number
  top: number
  width: number
  height: number
  rotation: number
  clipToKeycap: boolean
  lockAspect: boolean
  naturalSize: { w: number; h: number } | null
  onToggleClipToKeycap: () => void
  onToggleLockAspect: () => void
  onRestoreAspect: () => void
  onResetRotation: () => void
}

function KeycapImageControlOverlay({
  left, top, width, height, rotation,
  clipToKeycap,
  lockAspect, naturalSize,
  onToggleClipToKeycap,
  onToggleLockAspect, onRestoreAspect, onResetRotation,
}: KeycapImageControlOverlayProps) {
  const btnTop = -(26 + CTRL_HANDLE / 2)

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        transformOrigin: "center center",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {rotation !== 0 && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onResetRotation() }}
          title="恢复水平（重置旋转）"
          style={{
            position: "absolute",
            top: btnTop,
            right: 2 * (CTRL_BTN + CTRL_GAP) - CTRL_HANDLE / 2,
            width: CTRL_BTN,
            height: CTRL_BTN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            border: "1px solid #3b82f6",
            borderRadius: 4,
            cursor: "pointer",
            padding: 0,
            color: "#3b82f6",
            pointerEvents: "auto",
          }}
        >
          <svg
            viewBox="0 0 12 12"
            width={CTRL_ICON}
            height={CTRL_ICON}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2 6a4 4 0 1 0 .8-2.4" />
            <path d="M2 2v2.5h2.5" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggleClipToKeycap() }}
        title={clipToKeycap ? "已裁切到键帽（点击切换为自由显示）" : "自由显示（点击裁切到键帽）"}
        style={{
          position: "absolute",
          top: btnTop,
          right: (rotation !== 0 ? 3 : 2) * (CTRL_BTN + CTRL_GAP) - CTRL_HANDLE / 2,
          width: CTRL_BTN,
          height: CTRL_BTN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: clipToKeycap ? "#3b82f6" : "white",
          border: "1px solid #3b82f6",
          borderRadius: 4,
          cursor: "pointer",
          padding: 0,
          color: clipToKeycap ? "white" : "#3b82f6",
          pointerEvents: "auto",
        }}
      >
        <svg
          viewBox="0 0 12 12"
          width={CTRL_ICON}
          height={CTRL_ICON}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="1" y="1" width="4.2" height="4.2" rx="0.8" fill={clipToKeycap ? "currentColor" : "none"} opacity={clipToKeycap ? 0.3 : 1} />
          <rect x="6.8" y="1" width="4.2" height="4.2" rx="0.8" fill={clipToKeycap ? "currentColor" : "none"} opacity={clipToKeycap ? 0.3 : 1} />
          <rect x="1" y="6.8" width="4.2" height="4.2" rx="0.8" fill={clipToKeycap ? "currentColor" : "none"} opacity={clipToKeycap ? 0.3 : 1} />
          <rect x="6.8" y="6.8" width="4.2" height="4.2" rx="0.8" fill={clipToKeycap ? "currentColor" : "none"} opacity={clipToKeycap ? 0.3 : 1} />
        </svg>
      </button>

      {naturalSize && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRestoreAspect() }}
          title="恢复原始比例"
          style={{
            position: "absolute",
            top: btnTop,
            right: CTRL_BTN + CTRL_GAP - CTRL_HANDLE / 2,
            width: CTRL_BTN,
            height: CTRL_BTN,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "white",
            border: "1px solid #3b82f6",
            borderRadius: 4,
            cursor: "pointer",
            padding: 0,
            color: "#3b82f6",
            pointerEvents: "auto",
          }}
        >
          <svg
            viewBox="0 0 12 12"
            width={CTRL_ICON}
            height={CTRL_ICON}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 4.5V1h3.5" />
            <path d="M1 1l3 3" />
            <path d="M11 7.5V11H7.5" />
            <path d="M11 11l-3-3" />
          </svg>
        </button>
      )}

      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onToggleLockAspect() }}
        title={lockAspect ? "等比缩放（点击切换为自由缩放）" : "自由缩放（点击切换为等比缩放）"}
        style={{
          position: "absolute",
          top: btnTop,
          right: -CTRL_HANDLE / 2,
          width: CTRL_BTN,
          height: CTRL_BTN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: lockAspect ? "#3b82f6" : "white",
          border: "1px solid #3b82f6",
          borderRadius: 4,
          cursor: "pointer",
          padding: 0,
          color: lockAspect ? "white" : "#3b82f6",
          pointerEvents: "auto",
        }}
      >
        <svg
          viewBox="0 0 12 12"
          width={CTRL_ICON}
          height={CTRL_ICON}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
    </div>
  )
}

// ─── 单张图片的变换控件（SVG + HTML 浮层） ─────────────
export interface SvgImageElementProps {
  img: KeycapEditorImage
  clipToKeycap: boolean
  isSelected: boolean
  /** modalScale：SVG 显示比例，用于换算鼠标偏移 */
  scale: number
  clipId: string
  svgRef: React.RefObject<SVGSVGElement | null>
  overlayContainerRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onToggleClipToKeycap: () => void
  onCommit: (id: string, patch: Partial<Omit<KeycapEditorImage, "id">>) => void
}

export function SvgImageElement({
  img, clipToKeycap, isSelected, scale, clipId, svgRef, overlayContainerRef, onSelect, onToggleClipToKeycap, onCommit,
}: SvgImageElementProps) {
  const [lockAspect, setLockAspect] = useState(true)
  const lockAspectRef = useRef(lockAspect)
  lockAspectRef.current = lockAspect

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const domImg = new window.Image()
    domImg.onload = () => setNaturalSize({ w: domImg.naturalWidth, h: domImg.naturalHeight })
    domImg.src = img.src
  }, [img.src])

  // 实时预览（null = 无交互进行中）
  const [live, setLive] = useState<LivePatch | null>(null)

  // 显示值 = 已提交值 + 实时 delta
  const dispX = live?.x ?? img.x
  const dispY = live?.y ?? img.y
  const dispW = live?.width ?? img.width
  const dispH = live?.height ?? img.height
  const dispRot = live?.rotation ?? (img.rotation ?? 0)

  // 键帽本地坐标（viewBox 原点 = 键帽底座左上角）
  const absX = dispX
  const absY = dispY
  const imgCx = absX + dispW / 2
  const imgCy = absY + dispH / 2

  // 随 scale 适配的尺寸常量（与外层 canvas-element-layer 完全一致）
  const HS = 7 / scale         // 角点/边中点句柄正方形尺寸
  const EL = HS * 2            // 边中点句柄长轴
  const RL = 22 / scale        // 旋转连接线长度
  const RR = 5 / scale         // 旋转圆圈半径
  const SW = 1 / scale         // 手柄描边宽度
  const SEL_SW = 2 / scale     // 选中框描边宽度

  // ─── 拖拽移动 ──────────────────────────────────────
  const handleDragDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      onSelect()
      const startX = img.x, startY = img.y
      const startMx = e.clientX, startMy = e.clientY
      const sc = scale

      function onMove(ev: MouseEvent) {
        const dx = (ev.clientX - startMx) / sc
        const dy = (ev.clientY - startMy) / sc
        setLive({ x: startX + dx, y: startY + dy })
      }
      function onUp(ev: MouseEvent) {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        const dx = (ev.clientX - startMx) / sc
        const dy = (ev.clientY - startMy) / sc
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) {
          onCommit(img.id, { x: startX + dx, y: startY + dy })
        }
        setLive(null)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [img.id, img.x, img.y, scale, onSelect, onCommit],
  )

  // ─── 缩放手柄 ──────────────────────────────────────
  const handleResizeDown = useCallback(
    (handle: ResizeHandle, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const startX = img.x, startY = img.y
      const startW = img.width, startH = img.height
      const startMx = e.clientX, startMy = e.clientY
      const sc = scale
      const la = lockAspectRef

      function compute(ev: MouseEvent): LivePatch {
        let dx = (ev.clientX - startMx) / sc
        let dy = (ev.clientY - startMy) / sc
        const isCorner = ["se", "sw", "ne", "nw"].includes(handle)
        if (isCorner && la.current) {
          const aspect = startW / startH
          const dw = handle === "sw" || handle === "nw" ? -dx : dx
          const dh = handle === "ne" || handle === "nw" ? -dy : dy
          let nDw: number, nDh: number
          if (Math.abs(dw) >= Math.abs(dh * aspect)) {
            nDw = dw; nDh = dw / aspect
          } else {
            nDh = dh; nDw = dh * aspect
          }
          dx = handle === "sw" || handle === "nw" ? -nDw : nDw
          dy = handle === "ne" || handle === "nw" ? -nDh : nDh
        }
        const MIN = 8
        let nx = startX, ny = startY, nw = startW, nh = startH
        if (handle === "se") { nw = Math.max(MIN, startW + dx); nh = Math.max(MIN, startH + dy) }
        else if (handle === "sw") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw; nh = Math.max(MIN, startH + dy) }
        else if (handle === "ne") { nw = Math.max(MIN, startW + dx); nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
        else if (handle === "nw") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw; nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
        else if (handle === "s") { nh = Math.max(MIN, startH + dy) }
        else if (handle === "n") { nh = Math.max(MIN, startH - dy); ny = startY + startH - nh }
        else if (handle === "e") { nw = Math.max(MIN, startW + dx) }
        else if (handle === "w") { nw = Math.max(MIN, startW - dx); nx = startX + startW - nw }
        return { x: nx, y: ny, width: nw, height: nh }
      }

      function onMove(ev: MouseEvent) { setLive(compute(ev)) }
      function onUp(ev: MouseEvent) {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        onCommit(img.id, compute(ev))
        setLive(null)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [img.id, img.x, img.y, img.width, img.height, scale, onCommit],
  )

  // ─── 旋转手柄 ──────────────────────────────────────
  const handleRotateDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const svg = svgRef.current
      if (!svg) return
      const rect = svg.getBoundingClientRect()
      const sc = scale
      const svgCx = dispX + dispW / 2
      const svgCy = dispY + dispH / 2
      const screenCx = rect.left + (svgCx + MODAL_VIEW_INSET) * sc
      const screenCy = rect.top + (svgCy + MODAL_VIEW_INSET) * sc
      const startAngle = Math.atan2(e.clientY - screenCy, e.clientX - screenCx)
      const startRot = dispRot

      function computeRot(ev: MouseEvent) {
        const angle = Math.atan2(ev.clientY - screenCy, ev.clientX - screenCx)
        const delta = (angle - startAngle) * (180 / Math.PI)
        return Math.round(((startRot + delta) % 360 + 360) % 360)
      }

      function onMove(ev: MouseEvent) { setLive({ rotation: computeRot(ev) }) }
      function onUp(ev: MouseEvent) {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        onCommit(img.id, { rotation: computeRot(ev) })
        setLive(null)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [img.id, dispX, dispY, dispW, dispH, dispRot, scale, svgRef, onCommit],
  )

  const overlay =
    isSelected && overlayContainerRef.current
      ? createPortal(
          <KeycapImageControlOverlay
            left={(dispX + MODAL_VIEW_INSET) * scale}
            top={(dispY + MODAL_VIEW_INSET) * scale}
            width={dispW * scale}
            height={dispH * scale}
            rotation={dispRot}
            clipToKeycap={clipToKeycap}
            lockAspect={lockAspect}
            naturalSize={naturalSize}
            onToggleClipToKeycap={onToggleClipToKeycap}
            onToggleLockAspect={() => setLockAspect((v) => !v)}
            onRestoreAspect={() => {
              if (!naturalSize) return
              const newH = Math.round(dispW * (naturalSize.h / naturalSize.w))
              onCommit(img.id, { width: dispW, height: newH })
            }}
            onResetRotation={() => onCommit(img.id, { rotation: 0 })}
          />,
          overlayContainerRef.current,
        )
      : null

  // ─── 角点手柄定义 ───────────────────────────────────
  const cornerHandles: { id: ResizeHandle; x: number; y: number; cursor: string }[] = [
    { id: "nw", x: absX - HS / 2, y: absY - HS / 2, cursor: "nwse-resize" },
    { id: "ne", x: absX + dispW - HS / 2, y: absY - HS / 2, cursor: "nesw-resize" },
    { id: "sw", x: absX - HS / 2, y: absY + dispH - HS / 2, cursor: "nesw-resize" },
    { id: "se", x: absX + dispW - HS / 2, y: absY + dispH - HS / 2, cursor: "nwse-resize" },
  ]

  // ─── 边中点手柄定义 ────────────────────────────────
  const edgeHandles: { id: ResizeHandle; x: number; y: number; w: number; h: number; cursor: string }[] = [
    { id: "n", x: imgCx - EL / 2, y: absY - HS / 2, w: EL, h: HS, cursor: "ns-resize" },
    { id: "s", x: imgCx - EL / 2, y: absY + dispH - HS / 2, w: EL, h: HS, cursor: "ns-resize" },
    { id: "e", x: absX + dispW - HS / 2, y: imgCy - EL / 2, w: HS, h: EL, cursor: "ew-resize" },
    { id: "w", x: absX - HS / 2, y: imgCy - EL / 2, w: HS, h: EL, cursor: "ew-resize" },
  ]

  return (
    <>
      <g>
      {/* 图片层：可切换是否裁切到键帽 */}
      {clipToKeycap ? (
      <g clipPath={`url(#${clipId})`}>
      <g transform={`rotate(${dispRot}, ${imgCx}, ${imgCy})`}>
        <image
          href={img.src}
          x={absX} y={absY}
          width={dispW} height={dispH}
          opacity={img.opacity}
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        />
      </g>
      </g>
      ) : (
      <g transform={`rotate(${dispRot}, ${imgCx}, ${imgCy})`}>
        <image
          href={img.src}
          x={absX} y={absY}
          width={dispW} height={dispH}
          opacity={img.opacity}
          preserveAspectRatio="none"
          style={{ pointerEvents: "none" }}
        />
      </g>
      )}

      {/* 交互层：始终在裁切层外，确保选中框/手柄完整可见 */}
      <g transform={`rotate(${dispRot}, ${imgCx}, ${imgCy})`}>
        {/* 透明拖拽热区 + 选中边框 */}
        <rect
          x={absX} y={absY}
          width={dispW} height={dispH}
          fill="transparent"
          stroke={isSelected ? "#3b82f6" : "transparent"}
          strokeWidth={SEL_SW}
          strokeDasharray={isSelected ? `${5 / scale} ${3 / scale}` : undefined}
          style={{ cursor: "move", pointerEvents: "all" }}
          onMouseDown={handleDragDown}
          onClick={(e) => e.stopPropagation()}
        />

        {isSelected && (
          <>
            {/* ── 旋转手柄（顶边中心上方） ── */}
            {/* 连接线 */}
            <line
              x1={imgCx} y1={absY - HS / 2}
              x2={imgCx} y2={absY - HS / 2 - RL}
              stroke="#3b82f6" strokeWidth={SW}
              style={{ pointerEvents: "none" }}
            />
            {/* 旋转圆圈 */}
            <circle
              cx={imgCx} cy={absY - HS / 2 - RL - RR}
              r={RR}
              fill="white"
              stroke="#3b82f6" strokeWidth={SW}
              style={{ cursor: "grab", pointerEvents: "all" }}
              onMouseDown={handleRotateDown}
              onClick={(e) => e.stopPropagation()}
            />

            {/* ── 4 个角点缩放手柄 ── */}
            {cornerHandles.map((h) => (
              <rect
                key={h.id}
                x={h.x} y={h.y}
                width={HS} height={HS}
                fill="white"
                stroke="#3b82f6" strokeWidth={SW}
                rx={SW}
                style={{ cursor: h.cursor, pointerEvents: "all" }}
                onMouseDown={(e) => handleResizeDown(h.id, e)}
                onClick={(e) => e.stopPropagation()}
              />
            ))}

            {/* ── 4 个边中点单轴缩放手柄 ── */}
            {edgeHandles.map((h) => (
              <rect
                key={h.id}
                x={h.x} y={h.y}
                width={h.w} height={h.h}
                fill="white"
                stroke="#3b82f6" strokeWidth={SW}
                rx={Math.min(h.w, h.h) / 2}
                style={{ cursor: h.cursor, pointerEvents: "all" }}
                onMouseDown={(e) => handleResizeDown(h.id, e)}
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </>
        )}
      </g>
      </g>
      {overlay}
    </>
  )
}
