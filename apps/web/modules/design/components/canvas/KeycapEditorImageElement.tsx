"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { type ResizeHandle, computeResizePatch, normalizeAngleDeg } from "./imageElementUtils"
import { ResetRotationIcon, RestoreAspectIcon, LockAspectIcon } from "./ImageControlIcons"

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

const SELECTION_BORDER = "var(--design-selection-border)"
const SELECTION_SURFACE = "var(--background)"
const SELECTION_ON = "var(--primary-foreground)"

// ─── 每张图片的实时变换预览 ────────────────────────────
interface LivePatch {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
}

// ─── 图片控件 HTML 浮层（与 canvas-element-layer 一致，避免 SVG 缩放导致图标发糊） ──
const CTRL_BTN = 20
const CTRL_ICON = 12
const CTRL_HANDLE = 7
const CTRL_GAP = 4

export type ClipMode = "none" | "base" | "top"

interface KeycapImageControlOverlayProps {
  left: number
  top: number
  width: number
  height: number
  rotation: number
  clipMode: ClipMode
  lockAspect: boolean
  naturalSize: { w: number; h: number } | null
  onCycleClipMode: () => void
  onToggleLockAspect: () => void
  onRestoreAspect: () => void
  onResetRotation: () => void
  onCenterToTopFace: () => void
}

function KeycapImageControlOverlay({
  left, top, width, height, rotation,
  clipMode,
  lockAspect, naturalSize,
  onCycleClipMode,
  onToggleLockAspect, onRestoreAspect, onResetRotation,
  onCenterToTopFace,
}: KeycapImageControlOverlayProps) {
  const btnBase: React.CSSProperties = {
    width: CTRL_BTN,
    height: CTRL_BTN,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: SELECTION_SURFACE,
    border: `1px solid ${SELECTION_BORDER}`,
    borderRadius: 4,
    cursor: "pointer",
    padding: 0,
    color: SELECTION_BORDER,
    pointerEvents: "auto",
    flexShrink: 0,
  }

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
      {/* 所有按钮统一放入 flex 横排，居中悬浮于图片上方，不依赖图片宽度 */}
      <div
        style={{
          position: "absolute",
          bottom: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginBottom: CTRL_HANDLE / 2 + 2,
          display: "flex",
          alignItems: "center",
          gap: CTRL_GAP,
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      >
        {/* 居中到 Top Face */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onCenterToTopFace() }}
          title="居中到 Top Face"
          style={btnBase}
        >
          <svg viewBox="0 0 12 12" width={CTRL_ICON} height={CTRL_ICON} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
            <path d="M6 1.5v2M6 8.5v2M1.5 6h2M8.5 6h2" />
            <path d="M6 1.5l-.7.7M6 1.5l.7.7M6 10.5l-.7-.7M6 10.5l.7-.7M1.5 6l.7-.7M1.5 6l.7.7M10.5 6l-.7-.7M10.5 6l-.7.7" strokeWidth={0.9} />
          </svg>
        </button>

        {/* 分隔线 */}
        <div style={{ width: 1, height: 14, background: SELECTION_BORDER, opacity: 0.3, flexShrink: 0 }} />

        {/* 裁切模式循环 */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onCycleClipMode() }}
          title={
            clipMode === "none" ? "自由显示（点击裁切到键帽底座）" :
            clipMode === "base" ? "已裁切到键帽底座（点击裁切到顶面）" :
            "已裁切到键帽顶面（点击切换为自由显示）"
          }
          style={{
            ...btnBase,
            background: clipMode !== "none" ? SELECTION_BORDER : SELECTION_SURFACE,
            color: clipMode !== "none" ? SELECTION_ON : SELECTION_BORDER,
          }}
        >
          {clipMode === "top" ? (
            <svg viewBox="0 0 12 12" width={CTRL_ICON} height={CTRL_ICON} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="10" height="10" rx="1.2" opacity={0.25} fill="currentColor" />
              <rect x="1" y="1" width="10" height="10" rx="1.2" />
              <rect x="3" y="3" width="6" height="6" rx="0.8" fill="currentColor" opacity={0.9} />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" width={CTRL_ICON} height={CTRL_ICON} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="1"   y="1"   width="4.2" height="4.2" rx="0.8" fill={clipMode === "base" ? "currentColor" : "none"} opacity={clipMode === "base" ? 0.3 : 1} />
              <rect x="6.8" y="1"   width="4.2" height="4.2" rx="0.8" fill={clipMode === "base" ? "currentColor" : "none"} opacity={clipMode === "base" ? 0.3 : 1} />
              <rect x="1"   y="6.8" width="4.2" height="4.2" rx="0.8" fill={clipMode === "base" ? "currentColor" : "none"} opacity={clipMode === "base" ? 0.3 : 1} />
              <rect x="6.8" y="6.8" width="4.2" height="4.2" rx="0.8" fill={clipMode === "base" ? "currentColor" : "none"} opacity={clipMode === "base" ? 0.3 : 1} />
            </svg>
          )}
        </button>

        {/* 重置旋转（仅旋转不为 0 时显示） */}
        {rotation !== 0 && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onResetRotation() }}
            title="恢复水平（重置旋转）"
            style={btnBase}
          >
            <ResetRotationIcon size={CTRL_ICON} />
          </button>
        )}

        {/* 恢复原始比例（有 naturalSize 时显示） */}
        {naturalSize && (
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRestoreAspect() }}
            title="恢复原始比例"
            style={btnBase}
          >
            <RestoreAspectIcon size={CTRL_ICON} />
          </button>
        )}

        {/* 锁定宽高比 */}
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggleLockAspect() }}
          title={lockAspect ? "等比缩放（点击切换为自由缩放）" : "自由缩放（点击切换为等比缩放）"}
          style={{
            ...btnBase,
            background: lockAspect ? SELECTION_BORDER : SELECTION_SURFACE,
            color: lockAspect ? SELECTION_ON : SELECTION_BORDER,
          }}
        >
          <LockAspectIcon size={CTRL_ICON} locked={lockAspect} />
        </button>
      </div>
    </div>
  )
}

// ─── 单张图片的变换控件（SVG + HTML 浮层） ─────────────
export interface KeycapEditorImageElementProps {
  img: KeycapEditorImage
  clipMode: ClipMode
  isSelected: boolean
  /** modalScale：SVG 显示比例，用于换算鼠标偏移 */
  scale: number
  /** 底座轮廓的 clipPath id */
  clipId: string
  /** 顶面轮廓的 clipPath id */
  topFaceClipId: string
  svgRef: React.RefObject<SVGSVGElement | null>
  overlayContainerRef: React.RefObject<HTMLDivElement | null>
  onSelect: () => void
  onCycleClipMode: () => void
  onCenterToTopFace: () => void
  onCommit: (id: string, patch: Partial<Omit<KeycapEditorImage, "id">>) => void
}

export function KeycapEditorImageElement({
  img, clipMode, isSelected, scale, clipId, topFaceClipId, svgRef, overlayContainerRef, onSelect, onCycleClipMode, onCenterToTopFace, onCommit,
}: KeycapEditorImageElementProps) {
  const [lockAspect, setLockAspect] = useState(true)
  const lockAspectRef = useRef(lockAspect)
  lockAspectRef.current = lockAspect

  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const src = img.src
    // SVG data URL：从 base64 解码后解析 viewBox/width/height，避免 naturalWidth=0 的问题
    if (src.startsWith("data:image/svg+xml")) {
      try {
        const base64 = src.split(",")[1]
        const svgText = base64
          ? decodeURIComponent(escape(atob(base64)))
          : decodeURIComponent(src.split(",")[1] ?? "")
        const viewBoxMatch = svgText.match(
          /viewBox\s*=\s*["'][\s,]*[\d.+-]+[\s,]+[\d.+-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/,
        )
        if (viewBoxMatch?.[1] && viewBoxMatch?.[2]) {
          const w = parseFloat(viewBoxMatch[1])
          const h = parseFloat(viewBoxMatch[2])
          if (w > 0 && h > 0) { setNaturalSize({ w, h }); return }
        }
        const wMatch = svgText.match(/<svg[^>]*\s+width\s*=\s*["']([\d.]+)/)
        const hMatch = svgText.match(/<svg[^>]*\s+height\s*=\s*["']([\d.]+)/)
        if (wMatch?.[1] && hMatch?.[1]) {
          const w = parseFloat(wMatch[1])
          const h = parseFloat(hMatch[1])
          if (w > 0 && h > 0) { setNaturalSize({ w, h }); return }
        }
      } catch {
        // 解析失败则 fallback 到 Image 方式
      }
    }
    const domImg = new window.Image()
    domImg.onload = () => {
      if (domImg.naturalWidth > 0 && domImg.naturalHeight > 0) {
        setNaturalSize({ w: domImg.naturalWidth, h: domImg.naturalHeight })
      }
    }
    domImg.src = src
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
        const dx = (ev.clientX - startMx) / sc
        const dy = (ev.clientY - startMy) / sc
        const { x, y, w, h } = computeResizePatch(handle, dx, dy, startX, startY, startW, startH, la.current, 8)
        return { x, y, width: w, height: h }
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
        return normalizeAngleDeg(startRot, delta)
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
            clipMode={clipMode}
            lockAspect={lockAspect}
            naturalSize={naturalSize}
            onCycleClipMode={onCycleClipMode}
            onToggleLockAspect={() => setLockAspect((v) => !v)}
            onRestoreAspect={() => {
              if (!naturalSize) return
              const newH = Math.round(dispW * (naturalSize.h / naturalSize.w))
              onCommit(img.id, { width: dispW, height: newH })
            }}
            onResetRotation={() => onCommit(img.id, { rotation: 0 })}
            onCenterToTopFace={onCenterToTopFace}
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
      {/* 图片层：none=自由 / base=底座裁切 / top=顶面裁切 */}
      {clipMode !== "none" ? (
      <g clipPath={`url(#${clipMode === "top" ? topFaceClipId : clipId})`}>
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
          stroke={isSelected ? SELECTION_BORDER : "transparent"}
          strokeWidth={SEL_SW}
          strokeDasharray={isSelected ? `${5 / scale} ${3 / scale}` : undefined}
          style={{ cursor: "move", pointerEvents: "all" }}
          onMouseDown={handleDragDown}
          onClick={(e) => e.stopPropagation()}
        />

        {isSelected && (
          <>
            {/* ── 旋转手柄（底边中心下方） ── */}
            <line
              x1={imgCx} y1={absY + dispH + HS / 2}
              x2={imgCx} y2={absY + dispH + HS / 2 + RL}
              stroke={SELECTION_BORDER} strokeWidth={SW}
              style={{ pointerEvents: "none" }}
            />
            <circle
              cx={imgCx} cy={absY + dispH + HS / 2 + RL + RR}
              r={RR}
              fill={SELECTION_SURFACE}
              stroke={SELECTION_BORDER} strokeWidth={SW}
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
                fill={SELECTION_SURFACE}
                stroke={SELECTION_BORDER} strokeWidth={SW}
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
                fill={SELECTION_SURFACE}
                stroke={SELECTION_BORDER} strokeWidth={SW}
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
