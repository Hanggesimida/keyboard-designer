"use client"

import { useRef, useState, useEffect } from "react"
import type { GlobalKeycapStyle, KeycapOverride } from "@/modules/design/store/designUiStore"
import { resolveEffectiveBorderHidden } from "@/modules/design/lib/keycap-inspector/border"
import { registerTextMetrics } from "@/modules/design/store/textMetricsRegistry"
import {
  KEYCAP_GAP as _GAP,
  KEY_PAD_LEFT,
  KEY_PAD_TOP,
  KEY_PAD_RIGHT,
  KEY_PAD_BOTTOM,
  KEY_RADIUS_BASE as _KEY_RADIUS_BASE,
  KEY_RADIUS_TOP,
  KEY_LABEL_SIZE,
  KEY_LABEL_OPTICAL_CENTER_RATIO,
  clamp,
} from "@/modules/design/lib/design/keycapGeometry"
import {
  isGradientValue,
  parseCssLinearGradient,
  cssAngleToSvgCoords,
} from "@/modules/design/lib/design/gradientUtils"

export interface KeyDef {
  keyId: string
  label: string
  x: number
  y: number
  w: number
  h: number
  shape: string
}

/** 键帽间距（SVG 单位），供对齐计算使用 */
export const KEYCAP_GAP = _GAP
/** 顶面内边距（SVG 单位），供对齐计算使用 */
export const KEYCAP_PAD_LEFT = KEY_PAD_LEFT
export const KEYCAP_PAD_TOP = KEY_PAD_TOP
export const KEYCAP_PAD_RIGHT = KEY_PAD_RIGHT
export const KEYCAP_PAD_BOTTOM = KEY_PAD_BOTTOM
export const KEY_RADIUS_BASE = _KEY_RADIUS_BASE

const GAP = KEYCAP_GAP

// ─── SVG gradient helper ───────────────────────────────────────────────────────

interface SvgFillResult {
  /** linearGradient element to place inside <defs>, or null for solid fills */
  gradientDef: React.ReactElement | null
  /** fill attribute value: gradient URL or the original solid color string */
  fill: string
}

function toSvgFill(value: string, id: string): SvgFillResult {
  if (!isGradientValue(value)) return { gradientDef: null, fill: value }
  const parsed = parseCssLinearGradient(value)
  if (!parsed) return { gradientDef: null, fill: value }
  const { x1, y1, x2, y2 } = cssAngleToSvgCoords(parsed.angle)
  const gradientDef = (
    <linearGradient
      key={id}
      id={id}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      gradientUnits="objectBoundingBox"
    >
      {parsed.stops.map((stop) => (
        <stop key={stop.id} offset={`${stop.pos}%`} stopColor={stop.color} />
      ))}
    </linearGradient>
  )
  return { gradientDef, fill: `url(#${id})` }
}

const KEY_SELECTED_STROKE_WIDTH = 2

interface KeycapNodeProps {
  keyDef: KeyDef
  unit: number
  isSelected?: boolean
  /** shiftKey 为 true 表示 Shift+点击（追加/切换选中） */
  onSelect?: (shiftKey: boolean) => void
  override?: KeycapOverride
  /** 全局键帽样式（单键 override 优先） */
  globalDefaults?: GlobalKeycapStyle
  fontFamily?: string
  /** 当前键帽是否处于标签拖拽编辑模式 */
  isLabelEditing?: boolean
  /** 双击顶面后触发，通知父组件进入标签编辑模式 */
  onEnterLabelEdit?: () => void
  /** 当前画布缩放比例，用于将屏幕像素转换为 SVG 坐标 */
  zoom?: number
  /** 拖拽结束后回调最终偏移值（SVG 单位，相对顶面中心） */
  onLabelOffsetChange?: (x: number, y: number) => void
  /**
   * 渲染模式，用于两阶段渲染（解决 ClippedImagesLayer 层叠顺序问题）：
   * - "full"（默认）：完整渲染所有内容
   * - "fills"：只渲染底层填充（底座、顶面色块），不渲染文字和边框
   * - "labels"：只渲染上层内容（顶面边框、文字、选中蓝框、交互矩形）
   */
  renderMode?: "full" | "fills" | "labels"
}

export function KeycapNode({
  keyDef,
  unit,
  isSelected = false,
  onSelect,
  override,
  globalDefaults,
  fontFamily,
  isLabelEditing = false,
  onEnterLabelEdit,
  zoom = 1,
  onLabelOffsetChange,
  renderMode = "full",
}: KeycapNodeProps) {
  const rawX = keyDef.x * unit
  const rawY = keyDef.y * unit
  const rawW = keyDef.w * unit
  const rawH = keyDef.h * unit

  const px = rawX + GAP / 2
  const py = rawY + GAP / 2
  const pw = rawW - GAP
  const ph = rawH - GAP

  const topX = px + KEY_PAD_LEFT
  const topY = py + KEY_PAD_TOP
  const topW = pw - KEY_PAD_LEFT - KEY_PAD_RIGHT
  const topH = ph - KEY_PAD_TOP - KEY_PAD_BOTTOM

  const baseFill =
    override?.bgColor ??
    globalDefaults?.bgColor ??
    "var(--design-keycap-fill-base)"
  const topFill =
    override?.topColor ??
    globalDefaults?.topColor ??
    "var(--design-keycap-fill-top)"

  const baseSvg = toSvgFill(baseFill, `kb-${keyDef.keyId}`)
  const topSvg = toSvgFill(topFill, `kt-${keyDef.keyId}`)
  const hasDefs = baseSvg.gradientDef !== null || topSvg.gradientDef !== null
  const resolvedBorder =
    override?.borderColor ??
    globalDefaults?.borderColor ??
    "var(--design-keycap-stroke)"
  const borderHidden = resolveEffectiveBorderHidden(override, globalDefaults)
  const baseStroke = isSelected
    ? "var(--design-keycap-selected-border)"
    : borderHidden
      ? "none"
      : resolvedBorder
  const baseStrokeWidth = isSelected ? KEY_SELECTED_STROKE_WIDTH : borderHidden ? 0 : 1
  const labelText = override?.labelText ?? keyDef.label
  const labelColor =
    override?.labelColor ??
    globalDefaults?.labelColor ??
    "var(--design-keycap-label)"
  const fontSize =
    override?.fontSize ?? globalDefaults?.fontSize ?? KEY_LABEL_SIZE
  const labelFontFamily =
    override?.fontFamily ?? fontFamily ?? "Inter, system-ui, sans-serif"

  // ─── 文字尺寸测量 ─────────────────────────────────────
  const textRef = useRef<SVGTextElement>(null)
  const [textHalfSize, setTextHalfSize] = useState({ w: 0, h: 0 })

  // 每当文字内容、字号或字体变化时重新测量，并将结果注册到全局注册表供对齐计算使用
  useEffect(() => {
    if (!textRef.current) return
    try {
      const bbox = textRef.current.getBBox()
      // 宽度用 getBBox 精确测量；高度用 fontSize，因为 getBBox.height 包含行距
      const halfW = bbox.width / 2
      const halfH = fontSize / 2
      setTextHalfSize({ w: halfW, h: halfH })
      registerTextMetrics(keyDef.keyId, halfW, halfH)
    } catch {
      // 元素不在可见树中时 getBBox 可能抛出，忽略即可
    }
  }, [labelText, fontSize, labelFontFamily, keyDef.keyId])

  // ─── 拖拽状态 ─────────────────────────────────────────
  // dragDelta 是当前拖拽过程中相对于 committedOffset 的增量
  const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null)

  // 用 ref 保持最新值，避免 document 事件监听器中的 stale closure
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const topWRef = useRef(topW)
  topWRef.current = topW
  const topHRef = useRef(topH)
  topHRef.current = topH
  const textHalfSizeRef = useRef(textHalfSize)
  textHalfSizeRef.current = textHalfSize
  const onLabelOffsetChangeRef = useRef(onLabelOffsetChange)
  onLabelOffsetChangeRef.current = onLabelOffsetChange

  const dragStartRef = useRef<{
    mouseX: number
    mouseY: number
    offsetX: number
    offsetY: number
  } | null>(null)

  // 退出编辑模式时重置拖拽状态
  useEffect(() => {
    if (!isLabelEditing) {
      dragStartRef.current = null
      setDragDelta(null)
    }
  }, [isLabelEditing])

  // ─── 拖拽处理 ─────────────────────────────────────────
  const handleTopFaceMouseDown = (e: React.MouseEvent<SVGRectElement>) => {
    if (!isLabelEditing) return
    e.stopPropagation()
    e.preventDefault()

    const committedX = override?.labelOffsetX ?? 0
    const committedY = override?.labelOffsetY ?? 0
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: committedX,
      offsetY: committedY,
    }
    setDragDelta({ x: 0, y: 0 })

    function onMove(ev: MouseEvent) {
      const start = dragStartRef.current
      if (!start) return
      const z = zoomRef.current
      const maxOffX = Math.max(0, topWRef.current / 2 - textHalfSizeRef.current.w)
      const maxOffY = Math.max(0, topHRef.current / 2 - textHalfSizeRef.current.h)
      const rawDx = (ev.clientX - start.mouseX) / z
      const rawDy = (ev.clientY - start.mouseY) / z
      const newOffX = clamp(start.offsetX + rawDx, -maxOffX, maxOffX)
      const newOffY = clamp(start.offsetY + rawDy, -maxOffY, maxOffY)
      setDragDelta({ x: newOffX - start.offsetX, y: newOffY - start.offsetY })
    }

    function onUp(ev: MouseEvent) {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)

      const start = dragStartRef.current
      if (!start) return
      dragStartRef.current = null

      const z = zoomRef.current
      const maxOffX = Math.max(0, topWRef.current / 2 - textHalfSizeRef.current.w)
      const maxOffY = Math.max(0, topHRef.current / 2 - textHalfSizeRef.current.h)
      const rawDx = (ev.clientX - start.mouseX) / z
      const rawDy = (ev.clientY - start.mouseY) / z
      const finalX = clamp(start.offsetX + rawDx, -maxOffX, maxOffX)
      const finalY = clamp(start.offsetY + rawDy, -maxOffY, maxOffY)

      // 没有实际移动时不写入 store（避免空undo记录）
      const moved =
        Math.abs(finalX - start.offsetX) > 0.5 ||
        Math.abs(finalY - start.offsetY) > 0.5
      if (moved) {
        onLabelOffsetChangeRef.current?.(finalX, finalY)
      }
      setDragDelta(null)
    }

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  const handleDoubleClick = (e: React.MouseEvent<SVGRectElement>) => {
    if (!isSelected) return
    e.stopPropagation()
    onEnterLabelEdit?.()
  }

  // ─── 计算文字实际显示位置 ──────────────────────────────
  const committedX = override?.labelOffsetX ?? 0
  const committedY = override?.labelOffsetY ?? 0
  // 用顶面半尺寸减去文字半尺寸，确保文字边缘不超出顶面
  const maxOffX = Math.max(0, topW / 2 - textHalfSize.w)
  const maxOffY = Math.max(0, topH / 2 - textHalfSize.h)
  const displayOffsetX = dragDelta
    ? clamp(committedX + dragDelta.x, -maxOffX, maxOffX)
    : clamp(committedX, -maxOffX, maxOffX)
  const displayOffsetY = dragDelta
    ? clamp(committedY + dragDelta.y, -maxOffY, maxOffY)
    : clamp(committedY, -maxOffY, maxOffY)

  const textX = topX + topW / 2 + displayOffsetX
  const textY = topY + topH / 2 + displayOffsetY
  const opticalOffsetY = fontSize * KEY_LABEL_OPTICAL_CENTER_RATIO
  const textYDraw = textY - opticalOffsetY

  const clickHandler = {
    onClick: (e: React.MouseEvent<SVGGElement>) => {
      e.stopPropagation()
      onSelect?.(e.shiftKey)
    },
  }

  // ─── fills 阶段：底座、顶面色块（无文字/边框）
  if (renderMode === "fills") {
    return (
      <g data-keycap="true" style={{ cursor: "pointer" }} {...clickHandler}>
        {hasDefs && (
          <defs>
            {baseSvg.gradientDef}
            {topSvg.gradientDef}
          </defs>
        )}
        <rect
          x={px} y={py} width={pw} height={ph} rx={KEY_RADIUS_BASE}
          fill={baseSvg.fill}
          stroke={borderHidden ? "none" : resolvedBorder}
          strokeWidth={borderHidden ? 0 : 1}
        />
        <rect
          x={topX} y={topY} width={topW} height={topH} rx={KEY_RADIUS_TOP}
          fill={topSvg.fill}
          style={{ pointerEvents: "none" }}
        />
      </g>
    )
  }

  // ─── labels 阶段：顶面边框、文字、选中蓝框、交互矩形（无底层填充）
  if (renderMode === "labels") {
    return (
      <g data-keycap="true" style={{ cursor: isLabelEditing ? "default" : "pointer" }} {...clickHandler}>
        {/* 顶面边框 */}
        <rect
          x={topX} y={topY} width={topW} height={topH} rx={KEY_RADIUS_TOP}
          fill="none"
          stroke={isLabelEditing ? "var(--design-keycap-selected-border)" : borderHidden ? "none" : resolvedBorder}
          strokeWidth={isLabelEditing ? 1 : borderHidden ? 0 : 0.5}
          strokeDasharray={isLabelEditing ? "3 2" : undefined}
          style={{ pointerEvents: "none" }}
        />
        {/* 标签文字 */}
        <text
          ref={textRef}
          x={textX} y={textYDraw}
          fontSize={fontSize} fill={labelColor}
          textAnchor="middle" dominantBaseline="central"
          style={{ userSelect: "none", pointerEvents: "none", fontFamily: labelFontFamily }}
        >
          {labelText}
        </text>
        {/* 选中蓝框覆盖层 */}
        {isSelected && (
          <rect
            x={px} y={py} width={pw} height={ph} rx={KEY_RADIUS_BASE}
            fill="none"
            stroke="var(--design-keycap-selected-border)"
            strokeWidth={KEY_SELECTED_STROKE_WIDTH}
            style={{ pointerEvents: "none" }}
          />
        )}
        {/* 透明交互层：响应双击进入编辑与标签拖拽 */}
        {isSelected && (
          <rect
            x={px} y={py} width={pw} height={ph} rx={KEY_RADIUS_BASE}
            fill="transparent"
            style={{ cursor: isLabelEditing ? "move" : "pointer" }}
            onDoubleClick={handleDoubleClick}
            onMouseDown={handleTopFaceMouseDown}
          />
        )}
      </g>
    )
  }

  // ─── full 阶段（默认）：完整渲染 ──────────────────────
  return (
    <g
      data-keycap="true"
      {...clickHandler}
      style={{ cursor: isLabelEditing ? "default" : "pointer" }}
    >
      {hasDefs && (
        <defs>
          {baseSvg.gradientDef}
          {topSvg.gradientDef}
        </defs>
      )}
      {/* 键帽底座 */}
      <rect
        x={px}
        y={py}
        width={pw}
        height={ph}
        rx={KEY_RADIUS_BASE}
        fill={baseSvg.fill}
        stroke={baseStroke}
        strokeWidth={baseStrokeWidth}
      />
      {/* 顶面填充 */}
      <rect
        x={topX}
        y={topY}
        width={topW}
        height={topH}
        rx={KEY_RADIUS_TOP}
        fill={topSvg.fill}
        style={{ pointerEvents: "none" }}
      />

      {/* 顶面边框叠层 */}
      <rect
        x={topX}
        y={topY}
        width={topW}
        height={topH}
        rx={KEY_RADIUS_TOP}
        fill="none"
        stroke={
          isLabelEditing
            ? "var(--design-keycap-selected-border)"
            : borderHidden
              ? "none"
              : resolvedBorder
        }
        strokeWidth={isLabelEditing ? 1 : borderHidden ? 0 : 0.5}
        strokeDasharray={isLabelEditing ? "3 2" : undefined}
        style={{ pointerEvents: "none" }}
      />

      {/* 标签文字（始终在最上层） */}
      <text
        ref={textRef}
        x={textX}
        y={textYDraw}
        fontSize={fontSize}
        fill={labelColor}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ userSelect: "none", pointerEvents: "none", fontFamily: labelFontFamily }}
      >
        {labelText}
      </text>
      {/* 透明交互层：选中时覆盖整颗键帽，响应双击进入编辑与标签拖拽 */}
      {isSelected && (
        <rect
          x={px}
          y={py}
          width={pw}
          height={ph}
          rx={KEY_RADIUS_BASE}
          fill="transparent"
          style={{ cursor: isLabelEditing ? "move" : "pointer" }}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleTopFaceMouseDown}
        />
      )}
    </g>
  )
}
