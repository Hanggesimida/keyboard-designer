"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { Home } from "lucide-react"
import { useDesignUIStore, useTemporalDesignStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { KeycapNode, KEY_RADIUS_BASE, KEYCAP_GAP, type KeyDef } from "./KeycapNode"
import {
  KEY_RADIUS_TOP,
  getTopFaceRects,
  getIsoBasePoints,
  getIsoTopFacePoints,
  getIsoTopFaceRadii,
  roundedPolygonPath,
} from "@/modules/design/lib/design/keycapGeometry"
import { CanvasElementLayer } from "./CanvasElementLayer"
import { KeycapEditorModal } from "./KeycapEditorModal"
import { CanvasToolbar } from "./CanvasToolbar"
import { useViewport } from "@/modules/design/hooks/useViewport"
import { usePanInteraction } from "@/modules/design/hooks/usePanInteraction"
import { useMarqueeSelection } from "@/modules/design/hooks/useMarqueeSelection"
import { isSvgFile, readSvgFile } from "@/modules/design/lib/design/svgUtils"

// ─── 常量 ──────────────────────────────────────────────
const ART_PAD = 28                    // 画板内边距

function getTemplateBounds(keys: KeyDef[], unit: number) {
  let maxX = 0
  let maxY = 0
  for (const k of keys) {
    maxX = Math.max(maxX, k.x + k.w)
    maxY = Math.max(maxY, k.y + k.h)
  }
  return {
    width: Math.ceil(maxX * unit),
    height: Math.ceil(maxY * unit),
  }
}

// ─── 键帽 Clip 图层 ────────────────────────────────────
/**
 * 将 clipToKeycaps=true 的画布图片裁剪到其下方所有重叠键帽的底座形状中渲染。
 * 坐标系：与 KeyboardTemplate SVG 相同（artboard 坐标减去 artPad）。
 *
 * 性能：用 useMemo 缓存重叠检测结果，keys 为模块级常量，
 * 仅在 canvasElements 变化时重算（而非每次渲染）。
 */
function ClippedImagesLayer({
  canvasElements,
  keys,
  unit,
  artPad,
}: {
  canvasElements: CanvasImageElement[]
  keys: KeyDef[]
  unit: number
  artPad: number
}) {
  const GAP = KEYCAP_GAP
  // 订阅实时拖拽偏移：只有 ClippedImagesLayer 重渲染，KeycapNode 等不受影响
  const liveDragOverrides = useDesignUIStore((s) => s.liveDragOverrides)
  const assetMap = useDesignUIStore((s) => s.assetMap)

  // useMemo 缓存重叠检测：仅在 canvasElements/keys/unit/artPad 变化时重算
  const clippedImageData = useMemo(() => {
    const clipped = canvasElements.filter(
      (el) => (el.clipToKeycaps ?? true) && (el.clipToKeycaps || el.clipToKeycapId),
    )
    return clipped
      .map((img) => {
        const imgSvgX = img.x - artPad
        const imgSvgY = img.y - artPad

        let overlappingKeys: KeyDef[]
        if (img.clipToKeycapId) {
          const key = keys.find((k) => k.keyId === img.clipToKeycapId)
          overlappingKeys = key ? [key] : []
        } else {
          overlappingKeys = keys.filter((key) => {
            const px = key.x * unit + GAP / 2
            const py = key.y * unit + GAP / 2
            const pw = key.w * unit - GAP
            const ph = key.h * unit - GAP
            return (
              imgSvgX < px + pw &&
              imgSvgX + img.width > px &&
              imgSvgY < py + ph &&
              imgSvgY + img.height > py
            )
          })
        }
        return { img, overlappingKeys, imgSvgX, imgSvgY }
      })
      .filter(({ overlappingKeys }) => overlappingKeys.length > 0)
  }, [canvasElements, keys, unit, artPad, GAP])

  if (clippedImageData.length === 0) return null

  return (
    <>
      {clippedImageData.map(({ img, overlappingKeys, imgSvgX, imgSvgY }) => {
        const clipId = `clip-canvas-img-${img.id}`
        const rotation = img.rotation ?? 0

        // 应用实时拖拽偏移（在 live 状态下跟手，其余时刻偏移为 0）
        const liveOff = liveDragOverrides[img.id]
        const liveX = imgSvgX + (liveOff?.dx ?? 0)
        const liveY = imgSvgY + (liveOff?.dy ?? 0)
        const imgCx = liveX + img.width / 2
        const imgCy = liveY + img.height / 2

        return (
          <g key={img.id}>
            <defs>
              <clipPath id={clipId}>
                {overlappingKeys.map((key) => {
                  const px = key.x * unit + GAP / 2
                  const py = key.y * unit + GAP / 2
                  const pw = key.w * unit - GAP
                  const ph = key.h * unit - GAP
                  if (img.clipToTopFace) {
                    if (key.shape === "iso") {
                      return (
                        <path
                          key={key.keyId}
                          d={roundedPolygonPath(getIsoTopFacePoints(px, py, pw, ph), getIsoTopFaceRadii(KEY_RADIUS_TOP))}
                        />
                      )
                    }
                    return getTopFaceRects(key.shape, px, py, pw, ph).map((r, ri) => (
                      <rect
                        key={`${key.keyId}-${ri}`}
                        x={r.x}
                        y={r.y}
                        width={r.w}
                        height={r.h}
                        rx={KEY_RADIUS_TOP}
                      />
                    ))
                  }
                  if (key.shape === "iso") {
                    return (
                      <path
                        key={key.keyId}
                        d={roundedPolygonPath(getIsoBasePoints(px, py, pw, ph), KEY_RADIUS_BASE)}
                      />
                    )
                  }
                  return (
                    <rect
                      key={key.keyId}
                      x={px}
                      y={py}
                      width={pw}
                      height={ph}
                      rx={KEY_RADIUS_BASE}
                    />
                  )
                })}
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`} opacity={img.opacity}>
              <g
                transform={
                  rotation !== 0
                    ? `rotate(${rotation},${imgCx},${imgCy})`
                    : undefined
                }
              >
                <image
                  href={assetMap[img.assetId] ?? ""}
                  x={liveX}
                  y={liveY}
                  width={img.width}
                  height={img.height}
                  preserveAspectRatio="none"
                  style={{ pointerEvents: "none" }}
                />
              </g>
            </g>
          </g>
        )
      })}
    </>
  )
}

// ─── 标签编辑状态 ──────────────────────────────────────
interface LabelEditTarget {
  keyId: string
  layerId: string
}

// ─── 键盘模板渲染 ──────────────────────────────────────
function KeyboardTemplate({
  keys,
  width,
  height,
  unit,
  selectedKeycapIds,
  onSelectKeycap,
  labelEditTarget,
  zoom,
  onEnterLabelEdit,
  onLabelOffsetChange,
  canvasElements,
}: {
  keys: KeyDef[]
  width: number
  height: number
  unit: number
  selectedKeycapIds: string[]
  onSelectKeycap: (layerId: string, keyId: string, shiftKey: boolean) => void
  labelEditTarget: LabelEditTarget | null
  zoom: number
  onEnterLabelEdit: (layerId: string, keyId: string) => void
  onLabelOffsetChange: (layerId: string, keyId: string, x: number, y: number) => void
  canvasElements: CanvasImageElement[]
}) {
  const layers = useDesignUIStore((s) => s.layers)
  const activeLayerId = useDesignUIStore((s) => s.activeLayerId)
  const layerKeycapOverrides = useDesignUIStore((s) => s.layerKeycapOverrides)
  const globalKeycapStyle = useDesignUIStore((s) => s.globalKeycapStyle)
  const fontFamily = useDesignUIStore((s) => s.fontFamily)
  const fontWeight = useDesignUIStore((s) => s.fontWeight)
  const fontStyle = useDesignUIStore((s) => s.fontStyle)

  // 按图层数组逆序渲染：layers[0] 为最顶层，在 SVG 中最后绘制（覆盖下方层）
  const reversedLayers = [...layers].reverse()

  // 是否有需要 clip 的图片——有则启用两阶段渲染，保证文字/边框在图片之上
  // clipToKeycaps（全局裁剪）或 clipToKeycapId（单键帽裁剪）均需两阶段渲染
  const hasClippedImages = canvasElements.some(
    (el) => (el.clipToKeycaps ?? true) && (el.clipToKeycaps || el.clipToKeycapId),
  )

  // 渲染一组图层中所有键帽，mode 控制渲染阶段
  function renderLayers(mode: "full" | "fills" | "labels") {
    return reversedLayers.map((layer) => {
      if (!layer.visible) return null
      const layerOverrides = layerKeycapOverrides[layer.id] ?? {}
      const isActiveLayer = layer.id === activeLayerId
      return (
        <g
          key={layer.id}
          data-layer-id={layer.id}
          opacity={layer.opacity}
          pointerEvents={layer.locked ? "none" : undefined}
        >
          {keys.map((key) => (
            <KeycapNode
              key={key.keyId}
              keyDef={key}
              unit={unit}
              isSelected={isActiveLayer && selectedKeycapIds.includes(key.keyId)}
              onSelect={(shiftKey) => onSelectKeycap(layer.id, key.keyId, shiftKey)}
              override={layerOverrides[key.keyId]}
              globalDefaults={globalKeycapStyle}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              fontStyle={fontStyle}
              isLabelEditing={
                labelEditTarget?.layerId === layer.id &&
                labelEditTarget?.keyId === key.keyId
              }
              zoom={zoom}
              onEnterLabelEdit={() => onEnterLabelEdit(layer.id, key.keyId)}
              onLabelOffsetChange={(x, y) =>
                onLabelOffsetChange(layer.id, key.keyId, x, y)
              }
              renderMode={mode}
              labelsHidden={layer.labelsHidden}
            />
          ))}
        </g>
      )
    })
  }

  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* 透明底层捕获空白区域点击 */}
      <rect width={width} height={height} fill="transparent" />

      {hasClippedImages ? (
        <>
          {/* 阶段一：只渲染填充（底座色、顶面色） */}
          {renderLayers("fills")}

          {/* 裁剪到键帽形状的画布图片，夹在填充与文字之间 */}
          <ClippedImagesLayer
            canvasElements={canvasElements}
            keys={keys}
            unit={unit}
            artPad={ART_PAD}
          />

          {/* 阶段二：只渲染上层内容（顶面边框、文字、选中蓝框、交互矩形） */}
          {renderLayers("labels")}
        </>
      ) : (
        /* 无 clip 图片时走完整渲染路径，避免额外开销 */
        renderLayers("full")
      )}

      {/* 增补区 Row Level 标识：在每个增补区键帽正下方显示 R 级别 */}
      {keys.some((k) => k.section === "supplement") && (
        <g style={{ pointerEvents: "none" }}>
          {keys
            .filter((k) => k.section === "supplement" && k.rowLevel)
            .map((key) => {
              const centerX = (key.x + key.w / 2) * unit
              const labelY = (key.y + key.h) * unit + 3
              return (
                <text
                  key={`supplement-rl-${key.keyId}`}
                  x={centerX}
                  y={labelY}
                  fontSize={6}
                  fill="rgba(255,255,255,0.45)"
                  textAnchor="middle"
                  dominantBaseline="hanging"
                  style={{ userSelect: "none" }}
                >
                  {key.rowLevel}
                </text>
              )
            })}
        </g>
      )}
    </svg>
  )
}

// ─── 画布主组件 ────────────────────────────────────────
export function DesignCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const artboardRef = useRef<HTMLDivElement>(null)
  const artboardBg = useDesignUIStore((s) => s.artboardBackground)
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)
  const setSelectedKeycapIds = useDesignUIStore((s) => s.setSelectedKeycapIds)
  const toggleKeycapSelection = useDesignUIStore((s) => s.toggleKeycapSelection)
  const setActiveLayer = useDesignUIStore((s) => s.setActiveLayer)
  const deselectAll = useDesignUIStore((s) => s.deselectAll)
  const setKeycapOverride = useDesignUIStore((s) => s.setKeycapOverride)
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const addAsset = useDesignUIStore((s) => s.addAsset)
  const addCanvasElement = useDesignUIStore((s) => s.addCanvasElement)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const undo = useTemporalDesignStore((s) => s.undo)
  const redo = useTemporalDesignStore((s) => s.redo)
  const pastStates = useTemporalDesignStore((s) => s.pastStates)
  const futureStates = useTemporalDesignStore((s) => s.futureStates)
  const keycapEditTarget = useDesignUIStore((s) => s.keycapEditTarget)
  const setKeycapEditTarget = useDesignUIStore((s) => s.setKeycapEditTarget)
  const resetAll = useDesignUIStore((s) => s.resetAll)
  const clearTemporalHistory = useTemporalDesignStore((s) => s.clear)
  const templateId = useDesignUIStore((s) => s.templateId)

  // ─── 响应式布局数据（随 templateId 变化而重算） ────────
  const { keys, unit, artW, artH, bounds } = useMemo(() => {
    const layout = getLayoutData(templateId)
    const u = layout.baseUnit
    const allKeys = layout.rows.flatMap((row) =>
      row.keys.map((key) => ({ ...key, section: row.section ?? "base" }))
    ) as KeyDef[]
    const b = getTemplateBounds(allKeys, u)
    return {
      keys: allKeys,
      unit: u,
      artW: b.width + ART_PAD * 2,
      artH: b.height + ART_PAD * 2,
      bounds: b,
    }
  }, [templateId])

  // ─── 拖放状态 ────────────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false)
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  // Delete/Backspace 键删除、方向键微调选中画布元素（单键帽编辑模式打开时由模态框处理）
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (keycapEditTarget) return

      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedElementId: eid } = useDesignUIStore.getState()
        if (eid) {
          e.preventDefault()
          removeCanvasElement(eid)
        }
        return
      }

      const arrowMap = {
        ArrowLeft:  [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp:    [0, -1],
        ArrowDown:  [0, 1],
      } as const
      if (e.key in arrowMap) {
        const { selectedElementId: eid, canvasElements: els } = useDesignUIStore.getState()
        if (!eid) return
        const el = els.find((c) => c.id === eid)
        if (!el) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const [dx, dy] = arrowMap[e.key as keyof typeof arrowMap]
        updateCanvasElement(eid, { x: Math.round(el.x + dx * step), y: Math.round(el.y + dy * step) })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [keycapEditTarget, removeCanvasElement, updateCanvasElement])

  // ─── 从文件系统拖入图片 / SVG ────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    const hasImage = Array.from(e.dataTransfer.items).some(
      (item) =>
        item.kind === "file" &&
        (item.type.startsWith("image/") || item.type === "image/svg+xml"),
    )
    if (!hasImage) return
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const container = containerRef.current
      if (!container) return

      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/") || isSvgFile(f),
      )
      if (files.length === 0) return

      // 计算 drop 位置相对于画板的坐标（世界坐标）
      const rect = container.getBoundingClientRect()
      const clientX = e.clientX - rect.left
      const clientY = e.clientY - rect.top

      files.forEach((file) => {
        if (isSvgFile(file)) {
          readSvgFile(file).then((result) => {
            if (!result) return
            const assetId = addAsset(result.src)
            const vp = viewportRef.current
            const defaultW = Math.min(result.w, artW - ART_PAD * 2)
            const defaultH = Math.round((defaultW / result.w) * result.h)
            const artX = Math.round((clientX - vp.x) / vp.zoom - defaultW / 2)
            const artY = Math.round((clientY - vp.y) / vp.zoom - defaultH / 2)
            addCanvasElement({
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: "image",
              assetId,
              x: Math.max(0, artX),
              y: Math.max(0, artY),
              width: defaultW,
              height: defaultH,
              opacity: 1,
              locked: false,
              isSvg: true,
            })
          })
          return
        }

        const reader = new FileReader()
        reader.onload = (ev) => {
          const src = ev.target?.result as string
          if (!src) return
          const img = new Image()
          img.onload = () => {
            const assetId = addAsset(src)
            const vp = viewportRef.current
            const artX = Math.round((clientX - vp.x) / vp.zoom - img.width / 2)
            const artY = Math.round((clientY - vp.y) / vp.zoom - img.height / 2)
            const defaultW = Math.min(img.width, artW - ART_PAD * 2)
            const defaultH = Math.round((defaultW / img.width) * img.height)
            addCanvasElement({
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: "image",
              assetId,
              x: Math.max(0, artX),
              y: Math.max(0, artY),
              width: defaultW,
              height: defaultH,
              opacity: 1,
              locked: false,
            })
          }
          img.src = src
        }
        reader.readAsDataURL(file)
      })
    },
    [addAsset, addCanvasElement, artW],
  )

  // ─── 视口与交互 ──────────────────────────────────────
  const { viewport, fitToScreen, panBy } = useViewport({
    containerRef,
    artW,
    artH,
    disabled: !!keycapEditTarget,
  })
  // 用 ref 存储最新 viewport，使 onDrop 等回调能读到最新值而不产生闭包旧值
  const viewportRef = useRef(viewport)
  useEffect(() => {
    viewportRef.current = viewport
  }, [viewport])
  const isModalOpen = !!keycapEditTarget

  const panHandlers = usePanInteraction({
    onPanBy: panBy,
    disabled: isModalOpen,
  })
  const { isSpacePressed, isPanning, ...panEvents } = panHandlers

  const {
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    onClick: handleClick,
    marqueeOverlay,
  } = useMarqueeSelection({
    containerRef,
    viewport,
    keys,
    unit,
    artPad: ART_PAD,
    isSpacePressed,
    isPanning,
    selectedKeycapIds,
    setSelectedKeycapIds,
    clearSelection: deselectAll,
    panHandlers: panEvents,
    disabled: isModalOpen,
  })

  // ─── 预过滤 image 类型（避免每次渲染重新 filter） ──────
  const imageCanvasElements = useMemo(
    () => canvasElements.filter((e): e is CanvasImageElement => e.type === "image"),
    [canvasElements],
  )

  // ─── 键帽选中处理 ────────────────────────────────────
  const handleSelectKeycap = useCallback((layerId: string, keyId: string, shiftKey: boolean) => {
    setActiveLayer(layerId)
    if (shiftKey) {
      toggleKeycapSelection(keyId)
    } else {
      setSelectedKeycapIds([keyId])
    }
  }, [setActiveLayer, toggleKeycapSelection, setSelectedKeycapIds])

  // ─── 进入单键帽编辑模式（打开模态框） ──────────────────
  const handleEnterLabelEdit = useCallback(
    (layerId: string, keyId: string) => {
      setKeycapEditTarget({ layerId, keyId })
    },
    [setKeycapEditTarget],
  )

  // ─── 标签偏移提交（内联编辑模式保留，模态框也会直接调 store） ──
  const handleLabelOffsetChange = useCallback(
    (layerId: string, keyId: string, x: number, y: number) => {
      setKeycapOverride(layerId, keyId, { labelOffsetX: x, labelOffsetY: y })
    },
    [setKeycapOverride],
  )

  const getExportParams = useCallback(
    () => ({
      artboardEl: artboardRef.current,
      artW,
      artH,
      artPad: ART_PAD,
      unit,
      keys,
    }),
    [artW, artH, unit, keys],
  )

  // ─── 单键帽编辑模态框对应的 keyDef ────────────────────
  const editKeyDef = keycapEditTarget
    ? keys.find((k) => k.keyId === keycapEditTarget.keyId) ?? null
    : null

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: "#1e1e1e",
        backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        cursor: isPanning ? "grabbing" : isSpacePressed ? "grab" : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 画板 */}
      <div
        ref={artboardRef}
        className="absolute rounded-sm shadow-2xl"
        style={{
          width: artW,
          height: artH,
          backgroundColor: artboardBg,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          transition: "background-color 0.15s",
          willChange: "transform",
        }}
      >
        <div style={{ position: "absolute", top: ART_PAD, left: ART_PAD }}>
          <KeyboardTemplate
            keys={keys}
            width={bounds.width}
            height={bounds.height}
            unit={unit}
            selectedKeycapIds={selectedKeycapIds}
            onSelectKeycap={handleSelectKeycap}
            labelEditTarget={null}
            zoom={viewport.zoom}
            onEnterLabelEdit={handleEnterLabelEdit}
            onLabelOffsetChange={handleLabelOffsetChange}
            canvasElements={imageCanvasElements}
          />
        </div>

        {/* 自由元素层（图片/贴纸） */}
        <CanvasElementLayer
          viewport={viewport}
          artW={artW}
          artH={artH}
          isSpacePressed={isSpacePressed}
          isPanning={isPanning}
        />

        {/* 拖入图片时的高亮遮罩 */}
        {isDragOver && (
          <div
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-sm border-2 border-dashed border-blue-400/70 bg-blue-400/10"
          >
            <span className="rounded bg-black/60 px-3 py-1.5 text-[13px] text-blue-300 select-none backdrop-blur-sm">
              释放以添加图片
            </span>
          </div>
        )}
      </div>

      {/* 框选矩形 */}
      {marqueeOverlay && (
        <div
          className="pointer-events-none absolute z-10 border border-blue-400/80 bg-blue-400/10"
          style={{
            left: marqueeOverlay.left,
            top: marqueeOverlay.top,
            width: marqueeOverlay.width,
            height: marqueeOverlay.height,
          }}
        />
      )}

      {/* 多选计数徽标 */}
      {selectedKeycapIds.length > 1 && (
        <div className="absolute bottom-4 right-4 rounded bg-blue-500/80 px-2 py-0.5 text-[11px] text-white select-none backdrop-blur-sm">
          已选 {selectedKeycapIds.length} 个键帽
        </div>
      )}

      {/* 缩放比例 + 快捷键提示（单键帽编辑模式打开时隐藏） */}
      {!keycapEditTarget && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 select-none rounded bg-black/40 px-2.5 py-1 text-[11px] text-white/40 backdrop-blur-sm"
          title="Ctrl+0 适配  Ctrl+1 实际尺寸"
        >
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <span className="opacity-40">·</span>
          <button
            className="hover:text-white/70 transition-colors"
            onClick={(e) => { e.stopPropagation(); fitToScreen() }}
          >
            适配
          </button>
        </div>
      )}

      {/* 返回首页按钮 */}
      <Link
        href="/"
        title="返回首页"
        onClick={(e) => e.stopPropagation()}
        className="absolute top-3 left-3 flex items-center justify-center rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70 bg-black/30 backdrop-blur-sm select-none"
      >
        <Home className="size-3.5" />
      </Link>

      {/* 顶部工具栏：撤销/重做 + 重置 + 导出 + 导入 */}
      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={() => { resetAll(); clearTemporalHistory() }}
        getExportParams={getExportParams}
        onAfterImport={clearTemporalHistory}
      />

      {/* 单键帽编辑模态框（portal 到容器 div 内，已有 fixed inset-0 覆盖） */}
      {keycapEditTarget && editKeyDef && (
        <KeycapEditorModal
          keyId={keycapEditTarget.keyId}
          layerId={keycapEditTarget.layerId}
          keyDef={editKeyDef}
          unit={unit}
          artPad={ART_PAD}
          onClose={() => setKeycapEditTarget(null)}
        />
      )}
    </div>
  )
}
