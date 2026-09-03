"use client"

import { useRef, useState, useEffect, useCallback, useMemo, type PointerEvent as ReactPointerEvent } from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Home } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { useDesignUIStore, useTemporalDesignStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { flattenLayout } from "@/modules/design/lib/design/layout"
import type { KeyDef } from "@/modules/design/types/design"
import { KeycapNode } from "./KeycapNode"
import {
  buildImageProjectionAtlasSpec,
  DESIGN_ART_PAD,
} from "@/modules/design/lib/design/imageProjection"
import { CanvasElementLayer } from "./CanvasElementLayer"
import { KeycapEditorModal } from "./KeycapEditorModal"
import { CanvasToolbar } from "./CanvasToolbar"
import { useViewport } from "@/modules/design/hooks/useViewport"
import { usePanInteraction } from "@/modules/design/hooks/usePanInteraction"
import { useMarqueeSelection } from "@/modules/design/hooks/useMarqueeSelection"
import { isSvgFile, readSvgFile } from "@/modules/design/lib/design/svgUtils"
import { useAutoExport } from "@/modules/design/hooks/useAutoExport"
import { generateJig } from "@/lib/export"
import {
  PREVIEW_3D_HEIGHT_MAX,
  PREVIEW_3D_HEIGHT_MIN,
} from "@/modules/design/lib/preview3d/constants"
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"
import {
  buildGlobalDistributedColors,
} from "@/modules/design/lib/design/resolveKeycapAppearance"
import { keyCentersFromDefs } from "@/modules/design/lib/design/distributeGradientColors"

const Keycap3DPreview = dynamic(
  () => import("../preview3d/Keycap3DPreview").then((m) => m.Keycap3DPreview),
  { ssr: false },
)

// ─── 常量 ──────────────────────────────────────────────
const ART_PAD = DESIGN_ART_PAD // 画板内边距（与 3D 投影规格共用）

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
 * 使用与 3D 图集相同的投影规格渲染键帽裁剪图片。
 * 坐标系：与 KeyboardTemplate SVG 相同（artboard 坐标减去 artPad）。
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
  const liveDragOverrides = useDesignUIStore((s) => s.liveDragOverrides)
  const assetMap = useDesignUIStore((s) => s.assetMap)

  const projection = useMemo(
    () =>
      buildImageProjectionAtlasSpec({
        elements: canvasElements,
        assetMap,
        keys,
        baseUnit: unit,
        artPad,
        liveDragOverrides,
      }),
    [artPad, assetMap, canvasElements, keys, liveDragOverrides, unit],
  )

  if (projection.items.length === 0) return null

  return (
    <>
      {projection.items.map((item) => {
        const clipId = `clip-canvas-img-${item.elementId}`
        const centerX = item.x + item.width / 2
        const centerY = item.y + item.height / 2

        return (
          <g key={item.elementId}>
            <defs>
              <clipPath id={clipId}>
                {item.clipPaths.map((path) => (
                  <path key={path} d={path} />
                ))}
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`} opacity={item.opacity}>
              <g
                transform={
                  item.rotationDeg !== 0
                    ? `rotate(${item.rotationDeg},${centerX},${centerY})`
                    : undefined
                }
              >
                <image
                  href={item.src}
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
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
  const pressedKeyIds = useDesignUIStore((s) => s.pressedKeyIds)

  const globalDistributedColors = useMemo(
    () =>
      buildGlobalDistributedColors(
        globalKeycapStyle.color,
        keyCentersFromDefs(keys),
      ),
    [globalKeycapStyle.color, keys],
  )

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
              isPressed={pressedKeyIds.includes(key.keyId)}
              onSelect={(shiftKey) => onSelectKeycap(layer.id, key.keyId, shiftKey)}
              override={layerOverrides[key.keyId]}
              globalDefaults={globalKeycapStyle}
              globalDistributedColors={globalDistributedColors}
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
                  fill="var(--muted-foreground)"
                  fillOpacity={0.45}
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
  const t = useTranslations("Design.canvas")
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
  const show3dPreview = useDesignUIStore((s) => s.show3dPreview)
  const preview3dHeight = useDesignUIStore((s) => s.preview3dHeight)
  const setPreview3dHeight = useDesignUIStore((s) => s.setPreview3dHeight)
  const hydratePreview3dHeight = useDesignUIStore((s) => s.hydratePreview3dHeight)

  // 客户端恢复预览高度，避免 SSR hydration mismatch
  useEffect(() => {
    hydratePreview3dHeight()
  }, [hydratePreview3dHeight])

  // ─── 响应式布局数据（随 templateId 变化而重算） ────────
  const { keys, unit, artW, artH, bounds } = useMemo(() => {
    const layout = getLayoutData(templateId)
    const u = layout.baseUnit
    const allKeys = flattenLayout(layout)
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
  const previewResizeRef = useRef<{ startY: number; startH: number } | null>(null)
  const canUndo = pastStates.length > 0
  const canRedo = futureStates.length > 0

  const handlePreviewResizePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    previewResizeRef.current = { startY: e.clientY, startH: preview3dHeight }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [preview3dHeight])

  const handlePreviewResizePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = previewResizeRef.current
    if (!drag) return
    const next = drag.startH + (e.clientY - drag.startY)
    setPreview3dHeight(next)
  }, [setPreview3dHeight])

  const handlePreviewResizePointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!previewResizeRef.current) return
    previewResizeRef.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [])

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

  // ─── 治具 SVG 生成（autoExport jig 复用） ─────────────
  const handleGenerateJig = useCallback(async () => {
    const {
      templateId: tid,
      artboardBackground,
      fontFamily,
      globalKeycapStyle,
      layers,
      layerKeycapOverrides,
      canvasElements: els,
      assetMap,
    } = useDesignUIStore.getState()

    const resolvedElements = els.map((el) => {
      const { assetId, ...rest } = el
      return { ...rest, src: assetMap[assetId] ?? "" }
    })

    const design = normalizeDesignColorFields({
      version: 1,
      templateId: tid,
      artboardBackground,
      fontFamily,
      globalKeycapStyle,
      layers,
      layerKeycapOverrides,
      canvasElements: resolvedElements,
    })

    const blob = await generateJig(design)

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const ts =
      `${now.getFullYear()}-` +
      `${pad(now.getMonth() + 1)}-` +
      `${pad(now.getDate())}-` +
      `${pad(now.getHours())}` +
      `${pad(now.getMinutes())}` +
      `${pad(now.getSeconds())}`
    const filename = `jig-${tid ?? "custom"}-${ts}.svg`

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, [])

  // ─── autoExport URL 参数自动触发导出（管理员从后台一键导出） ─
  useAutoExport(getExportParams, handleGenerateJig)

  // ─── 单键帽编辑模态框对应的 keyDef ────────────────────
  const editKeyDef = keycapEditTarget
    ? keys.find((k) => k.keyId === keycapEditTarget.keyId) ?? null
    : null

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background">
      {/* 顶部工具栏 / 返回首页：始终贴在中间列顶部，不被 3D 顶开 */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          asChild
          className="cursor-pointer bg-popover/80 backdrop-blur-sm border border-border text-foreground"
        >
          <Link
            href="/"
            title={t("backHome")}
            onClick={(e) => e.stopPropagation()}
          >
            <Home className="size-3.5" />
          </Link>
        </Button>
        <ThemeToggle
          size="icon-xs"
          className="cursor-pointer bg-popover/80 backdrop-blur-sm border border-border text-foreground"
        />
      </div>

      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={() => { resetAll(); clearTemporalHistory() }}
        getExportParams={getExportParams}
        onAfterImport={clearTemporalHistory}
      />

      {show3dPreview && (
        <div
          className="relative w-full shrink-0"
          style={{ height: preview3dHeight }}
        >
          <Keycap3DPreview />
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuemin={PREVIEW_3D_HEIGHT_MIN}
            aria-valuemax={PREVIEW_3D_HEIGHT_MAX}
            aria-valuenow={preview3dHeight}
            aria-label={t("resize3d")}
            title={t("dragResize")}
            className="absolute bottom-0 left-0 right-0 z-20 flex h-2 cursor-ns-resize items-center justify-center border-b border-border bg-transparent hover:bg-border/40 active:bg-border/60"
            onPointerDown={handlePreviewResizePointerDown}
            onPointerMove={handlePreviewResizePointerMove}
            onPointerUp={handlePreviewResizePointerUp}
            onPointerCancel={handlePreviewResizePointerUp}
          >
            <div className="pointer-events-none h-0.5 w-10 rounded-full bg-muted-foreground/40" />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(circle, var(--design-canvas-grid-dot) 1px, transparent 1px)",
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
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-sm border-2 border-dashed border-primary/70 bg-primary/10"
            >
              <span className="rounded bg-popover/90 px-3 py-1.5 text-[13px] text-primary select-none backdrop-blur-sm border border-border">
                {t("dropToAdd")}
              </span>
            </div>
          )}
        </div>

        {/* 框选矩形 */}
        {marqueeOverlay && (
          <div
            className="pointer-events-none absolute z-10 border border-primary/80 bg-primary/10"
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
          <div className="absolute bottom-4 right-4 rounded bg-primary/80 px-2 py-0.5 text-[11px] text-primary-foreground select-none backdrop-blur-sm">
            {t("selectedCount", { count: selectedKeycapIds.length })}
          </div>
        )}

        {/* 缩放比例 + 快捷键提示（单键帽编辑模式打开时隐藏） */}
        {!keycapEditTarget && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 select-none rounded bg-popover/90 border border-border px-2.5 py-1 text-[11px] text-muted-foreground backdrop-blur-sm"
            title={t("zoomHint")}
          >
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <span className="opacity-40">·</span>
            <Button
              variant="ghost"
              size="xs"
              className="h-auto px-1 py-0 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={(e) => { e.stopPropagation(); fitToScreen() }}
            >
              {t("fit")}
            </Button>
          </div>
        )}

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
    </div>
  )
}
