"use client"

import { useRef, useState, useEffect, useLayoutEffect, useCallback, useId } from "react"
import { X, ImagePlus, Trash2, Move, Crosshair } from "lucide-react"
import { useDesignUIStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import type { KeyDef } from "./KeycapNode"
import {
  KEYCAP_GAP as GAP,
  KEY_PAD_LEFT,
  KEY_PAD_TOP,
  KEY_PAD_RIGHT,
  KEY_PAD_BOTTOM,
  KEY_RADIUS_BASE,
  KEY_RADIUS_TOP,
  KEY_LABEL_SIZE,
  KEY_LABEL_OPTICAL_CENTER_RATIO,
  STEPPED_PAD_LEFT,
  STEPPED_PAD_TOP,
  STEPPED_PAD_RIGHT,
  STEPPED_PAD_BOTTOM,
  clamp,
  getIsoBasePoints,
  getIsoTopFacePoints,
  getIsoTopFaceRadii,
  roundedPolygonPath,
} from "@/modules/design/lib/design/keycapGeometry"
import { KeycapEditorImageElement, MODAL_VIEW_INSET, type KeycapEditorImage } from "./KeycapEditorImageElement"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@workspace/ui/components/button"
import { DEFAULT_KEYCAP_COLORS } from "@/modules/design/lib/designDefaults"
import { isSvgFile, readSvgFile } from "@/modules/design/lib/design/svgUtils"
import {
  computeLabelAlignPatch,
  resolveTextHalfDimensionsSingle,
  type AlignH,
  type AlignV,
} from "@/modules/design/lib/keycap-inspector/align"
import { getTextMetrics } from "@/modules/design/store/textMetricsRegistry"
import { LabelAlignmentGrid } from "@/modules/design/components/sidebar/sections/right/keycap-inspector/AlignmentGrid"
import { ColorRow } from "@/modules/design/components/sidebar/sections/right/keycap-inspector/ColorRow"

// 1. 组件属性接口定义
interface Props {
  keyId: string
  layerId: string
  keyDef: KeyDef
  unit: number
  /** 画布像素边距，来自 design-canvas.tsx 的 ART_PAD 常量 */
  artPad: number
  onClose: () => void
}

export function KeycapEditorModal({ keyId, layerId, keyDef, unit, artPad, onClose }: Props) {
  // 2. 从 Zustand Store 中获取状态与操作方法
  const override = useDesignUIStore((s) => s.layerKeycapOverrides[layerId]?.[keyId])
  const globalDefaults = useDesignUIStore((s) => s.globalKeycapStyle)
  const fontFamily = useDesignUIStore((s) => s.fontFamily)
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const assetMap = useDesignUIStore((s) => s.assetMap)
  const addAsset = useDesignUIStore((s) => s.addAsset)
  const addCanvasElement = useDesignUIStore((s) => s.addCanvasElement)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const setKeycapOverride = useDesignUIStore((s) => s.setKeycapOverride)

  const handleAlign = useCallback(
    (alignH: AlignH, alignV: AlignV) => {
      const currentFontSize = override?.fontSize ?? globalDefaults.fontSize ?? KEY_LABEL_SIZE
      const currentLabel = override?.labelText ?? keyDef.label
      const metrics = getTextMetrics(keyId)
      const { halfW, halfH } = resolveTextHalfDimensionsSingle(metrics, currentFontSize, currentLabel)
      const patch = computeLabelAlignPatch(keyDef, unit, alignH, alignV, halfW, halfH)
      setKeycapOverride(layerId, keyId, patch)
    },
    [override, globalDefaults.fontSize, keyDef, keyId, unit, layerId, setKeycapOverride],
  )

  const rawId = useId()
  const clipId = rawId.replace(/[^a-zA-Z0-9_-]/g, "-")

  const svgRef = useRef<SVGSVGElement>(null)
  const overlayContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState(false)
  const [isLabelHovered, setIsLabelHovered] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showCrosshair, setShowCrosshair] = useState(true)

  // 3. 动态计算文本 BBox 用于绘制选中边框
  const textRef = useRef<SVGTextElement>(null)
  const [textBBox, setTextBBox] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (textRef.current) {
      try {
        const next = textRef.current.getBBox()
        setTextBBox((prev) => {
          if (
            prev &&
            prev.x === next.x &&
            prev.y === next.y &&
            prev.width === next.width &&
            prev.height === next.height
          ) {
            return prev
          }
          return next
        })
      } catch {
        // 当元素未完全挂载到 DOM 时 getBBox 可能会报错，在此捕获
      }
    }
  })

  // 4. 键帽几何尺寸与布局计算
  const rawW = keyDef.w * unit
  const rawH = keyDef.h * unit
  const pw = rawW - GAP
  const ph = rawH - GAP

  const isIso = keyDef.shape === "iso"
  const isStepped = keyDef.shape === "stepped"

  // ISO：label 定位基准取上臂区域（对应 top_face_points 上半段）
  // 比例来自 ISO_TOP_FACE_POINT_RATIOS：左 0.124，上 0.027，右 0.868，折角 y 0.415
  // stepped：顶面偏左窄矩形，对应 STEPPED_PAD_* 常量
  const topX = isIso ? 0.124 * pw : isStepped ? STEPPED_PAD_LEFT : KEY_PAD_LEFT
  const topY = isIso ? 0.027 * ph : isStepped ? STEPPED_PAD_TOP : KEY_PAD_TOP
  const topW = isIso ? (0.868 - 0.124) * pw : isStepped ? pw - STEPPED_PAD_LEFT - STEPPED_PAD_RIGHT : pw - KEY_PAD_LEFT - KEY_PAD_RIGHT
  const topH = isIso ? (0.415 - 0.027) * ph : isStepped ? ph - STEPPED_PAD_TOP - STEPPED_PAD_BOTTOM : ph - KEY_PAD_TOP - KEY_PAD_BOTTOM

  // 5. 键帽默认样式及覆写样式读取
  const baseFill = override?.bgColor ?? globalDefaults.bgColor ?? DEFAULT_KEYCAP_COLORS.bgColor
  const topFill = override?.topColor ?? globalDefaults.topColor ?? DEFAULT_KEYCAP_COLORS.topColor
  const borderColor = override?.borderColor ?? globalDefaults.borderColor ?? DEFAULT_KEYCAP_COLORS.borderColor
  const labelText = override?.labelText ?? keyDef.label
  const labelColor = override?.labelColor ?? globalDefaults.labelColor ?? DEFAULT_KEYCAP_COLORS.labelColor
  const fontSize = override?.fontSize ?? globalDefaults.fontSize ?? KEY_LABEL_SIZE
  const labelFontFamily = override?.fontFamily ?? fontFamily ?? "Inter, system-ui, sans-serif"
  const letterSpacing = override?.letterSpacing ?? 0
  const lineHeightRatio = override?.lineHeightRatio ?? 1.2

  // 逐字符渲染，避免 CSS letter-spacing 在最后字符后附加多余尾部间距
  const renderChars = (text: string) =>
    Array.from(text).map((ch, i) => (
      <tspan key={i} dx={i === 0 ? 0 : letterSpacing}>{ch}</tspan>
    ))

  // 6. 将当前键帽的绝对坐标转换为内部相对坐标
  // 轴心公式 = artPad + keyDef.x * unit + GAP/2
  const keycapArtX = artPad + keyDef.x * unit + GAP / 2
  const keycapArtY = artPad + keyDef.y * unit + GAP / 2

  // 7. 过滤并格式化属于当前键帽的图片元素
  const keycapImages = canvasElements
    .filter((el): el is CanvasImageElement => el.type === "image" && el.clipToKeycapId === keyId)
    .map((el) => ({
      id: el.id,
      src: assetMap[el.assetId] ?? "",
      x: el.x - keycapArtX,
      y: el.y - keycapArtY,
      width: el.width,
      height: el.height,
      opacity: el.opacity,
      rotation: el.rotation,
      clipToKeycap: el.clipToKeycaps ?? true,
      clipToTopFace: el.clipToTopFace ?? false,
    }))

  // 8. 弹窗缩放与响应式 viewBox 适配
  const MAX_VIEW_W = 680
  const MAX_VIEW_H = 480
  const vbW = pw + MODAL_VIEW_INSET * 2
  const vbH = ph + MODAL_VIEW_INSET * 2
  const modalScale = Math.min(MAX_VIEW_W / vbW, MAX_VIEW_H / vbH, 10)
  const viewW = Math.round(vbW * modalScale)
  const viewH = Math.round(vbH * modalScale)

  // 9. 刻字（Label）拖拽与范围限制计算
  const committedLabelX = override?.labelOffsetX ?? 0
  const committedLabelY = override?.labelOffsetY ?? 0

  // 多行支持
  const labelLines = labelText.split("\n")
  const lineHeight = fontSize * lineHeightRatio
  const multiLineOffsetY =
    labelLines.length > 1 ? ((labelLines.length - 1) * lineHeight) / 2 : 0

  const maxOffX = Math.max(0, topW / 2 - fontSize / 2)
  const maxOffY = Math.max(0, topH / 2 - fontSize / 2)

  const [labelDelta, setLabelDelta] = useState<{ x: number; y: number } | null>(null)

  const displayLabelX = labelDelta
    ? clamp(committedLabelX + labelDelta.x, -maxOffX, maxOffX)
    : clamp(committedLabelX, -maxOffX, maxOffX)
  const displayLabelY = labelDelta
    ? clamp(committedLabelY + labelDelta.y, -maxOffY, maxOffY)
    : clamp(committedLabelY, -maxOffY, maxOffY)

  const textX = topX + topW / 2 + displayLabelX
  const textY = topY + topH / 2 + displayLabelY
  const textYDraw = textY - fontSize * KEY_LABEL_OPTICAL_CENTER_RATIO - multiLineOffsetY

  // 使用 ref 保存缩放比，避免拖拽回调中产生闭包旧值
  const modalScaleRef = useRef(modalScale)
  modalScaleRef.current = modalScale

  // 10. 全局快捷键监听（Esc 关闭，Delete/Backspace 删除图片，方向键微调位置）
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return

      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
        return
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedImageId) {
        e.preventDefault()
        removeCanvasElement(selectedImageId)
        setSelectedImageId(null)
        return
      }

      const arrowDelta: Record<string, readonly [number, number]> = {
        ArrowLeft:  [-1, 0],
        ArrowRight: [1,  0],
        ArrowUp:    [0, -1],
        ArrowDown:  [0,  1],
      }
      if (e.key in arrowDelta && selectedImageId) {
        const img = useDesignUIStore.getState().canvasElements.find((c) => c.id === selectedImageId)
        if (!img) return
        e.preventDefault()
        const step = e.shiftKey ? 10 : 1
        const [dx, dy] = arrowDelta[e.key] as [number, number]
        updateCanvasElement(selectedImageId, {
          x: Math.round(img.x + dx * step),
          y: Math.round(img.y + dy * step),
        })
        return
      }
      if (e.key in arrowDelta && selectedLabel) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 0.5
        const [dx, dy] = arrowDelta[e.key] as [number, number]
        const state = useDesignUIStore.getState()
        const cur = state.layerKeycapOverrides[layerId]?.[keyId]
        const curX = cur?.labelOffsetX ?? 0
        const curY = cur?.labelOffsetY ?? 0
        setKeycapOverride(layerId, keyId, {
          labelOffsetX: clamp(curX + dx * step, -maxOffX, maxOffX),
          labelOffsetY: clamp(curY + dy * step, -maxOffY, maxOffY),
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, selectedImageId, selectedLabel, layerId, keyId, maxOffX, maxOffY, removeCanvasElement, updateCanvasElement, setKeycapOverride])

  // 11. 屏幕坐标系向键帽局部坐标系的转换
  const clientToKeycapLocal = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return { x: 0, y: 0 }
      const rect = svg.getBoundingClientRect()
      return {
        x: (clientX - rect.left) / modalScaleRef.current - MODAL_VIEW_INSET,
        y: (clientY - rect.top) / modalScaleRef.current - MODAL_VIEW_INSET,
      }
    },
    [],
  )

  // 12. 更新图片在主画布 Store 中的坐标与属性
  const handleImageCommit = useCallback(
    (imgId: string, patch: Partial<Omit<KeycapEditorImage, "id">>) => {
      const artPatch: Partial<Omit<CanvasImageElement, "id" | "type">> = {}
      if (patch.x !== undefined) artPatch.x = patch.x + keycapArtX
      if (patch.y !== undefined) artPatch.y = patch.y + keycapArtY
      if (patch.width !== undefined) artPatch.width = patch.width
      if (patch.height !== undefined) artPatch.height = patch.height
      if (patch.opacity !== undefined) artPatch.opacity = patch.opacity
      if (patch.rotation !== undefined) artPatch.rotation = patch.rotation
      updateCanvasElement(imgId, artPatch)
    },
    [updateCanvasElement, keycapArtX, keycapArtY],
  )

  // 三态循环：none → base → top → none
  const handleCycleImageClipMode = useCallback(
    (imgId: string, currentClip: boolean, currentTopFace: boolean) => {
      if (!currentClip) {
        updateCanvasElement(imgId, { clipToKeycaps: true, clipToTopFace: false })
      } else if (!currentTopFace) {
        updateCanvasElement(imgId, { clipToTopFace: true })
      } else {
        updateCanvasElement(imgId, { clipToKeycaps: false, clipToTopFace: false })
      }
    },
    [updateCanvasElement],
  )

  // 13. 刻字区域拖拽事件流处理
  const labelDragRef = useRef<{
    startMouseX: number
    startMouseY: number
    startOffX: number
    startOffY: number
  } | null>(null)

  const handleLabelAreaMouseDown = useCallback(
    (e: React.MouseEvent<SVGRectElement>) => {
      e.stopPropagation()
      e.preventDefault()
      setSelectedImageId(null)

      labelDragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startOffX: committedLabelX,
        startOffY: committedLabelY,
      }
      setLabelDelta({ x: 0, y: 0 })

      function onMove(ev: MouseEvent) {
        const ref = labelDragRef.current
        if (!ref) return
        const scale = modalScaleRef.current
        setLabelDelta({
          x: (ev.clientX - ref.startMouseX) / scale,
          y: (ev.clientY - ref.startMouseY) / scale,
        })
      }

      function onUp(ev: MouseEvent) {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)

        const ref = labelDragRef.current
        if (!ref) return
        labelDragRef.current = null

        const scale = modalScaleRef.current
        const dx = (ev.clientX - ref.startMouseX) / scale
        const dy = (ev.clientY - ref.startMouseY) / scale
        const finalX = clamp(ref.startOffX + dx, -maxOffX, maxOffX)
        const finalY = clamp(ref.startOffY + dy, -maxOffY, maxOffY)

        if (
          Math.abs(finalX - ref.startOffX) > 0.3 ||
          Math.abs(finalY - ref.startOffY) > 0.3
        ) {
          setKeycapOverride(layerId, keyId, {
            labelOffsetX: finalX,
            labelOffsetY: finalY,
          })
        }
        setLabelDelta(null)
      }

      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [committedLabelX, committedLabelY, layerId, keyId, maxOffX, maxOffY, setKeycapOverride],
  )

  // 14. 拖拽及选择文件上传，并绑定当前键帽的 z-index 层级
  const processImageFiles = useCallback(
    (files: File[], dropX?: number, dropY?: number) => {
      const validFiles = files.filter(
        (f) => f.type.startsWith("image/") || isSvgFile(f),
      )

      validFiles.forEach((file) => {
        if (isSvgFile(file)) {
          readSvgFile(file).then((result) => {
            if (!result) return
            const assetId = addAsset(result.src)
            const scale = Math.min(pw / result.w, ph / result.h)
            const imgW = result.w * scale
            const imgH = result.h * scale
            const localX = dropX !== undefined ? dropX - imgW / 2 : (pw - imgW) / 2
            const localY = dropY !== undefined ? dropY - imgH / 2 : (ph - imgH) / 2
            addCanvasElement({
              id: `ki-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: "image",
              assetId,
              x: keycapArtX + localX,
              y: keycapArtY + localY,
              width: imgW,
              height: imgH,
              opacity: 1,
              locked: false,
              clipToKeycapId: keyId,
              isSvg: true,
            })
          })
          return
        }

        const reader = new FileReader()
        reader.onload = (ev) => {
          const src = ev.target?.result as string
          if (!src) return
          const domImg = new Image()
          domImg.onload = () => {
            const assetId = addAsset(src)
            // 图像等比例自适应缩放
            const scale = Math.min(pw / domImg.width, ph / domImg.height)
            const imgW = domImg.width * scale
            const imgH = domImg.height * scale
            // 计算基于键帽中心的落点坐标
            const localX = dropX !== undefined ? dropX - imgW / 2 : (pw - imgW) / 2
            const localY = dropY !== undefined ? dropY - imgH / 2 : (ph - imgH) / 2
            // 向全局 Store 中添加关联当前键帽 ID 的图片元素
            addCanvasElement({
              id: `ki-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: "image",
              assetId,
              x: keycapArtX + localX,
              y: keycapArtY + localY,
              width: imgW,
              height: imgH,
              opacity: 1,
              locked: false,
              clipToKeycapId: keyId,
            })
          }
          domImg.src = src
        }
        reader.readAsDataURL(file)
      })
    },
    [addAsset, addCanvasElement, keyId, pw, ph, keycapArtX, keycapArtY],
  )

  // 15. 外部元素拖拽进入 SVG 画布事件
  const handleSvgDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    const hasImage = Array.from(e.dataTransfer.items).some(
      (item) =>
        item.kind === "file" &&
        (item.type.startsWith("image/") || item.type === "image/svg+xml"),
    )
    if (!hasImage) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "copy"
    setIsDragOver(true)
  }, [])

  const handleSvgDragLeave = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleSvgDrop = useCallback(
    (e: React.DragEvent<SVGSVGElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const files = Array.from(e.dataTransfer.files)
      const local = clientToKeycapLocal(e.clientX, e.clientY)
      processImageFiles(files, local.x, local.y)
    },
    [clientToKeycapLocal, processImageFiles],
  )

  // 16. 点击文件上传按钮事件
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      processImageFiles(files)
      e.target.value = ""
    },
    [processImageFiles],
  )

  // 17. 弹窗 UI 渲染
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 弹窗主体 */}
      <div
        className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部状态栏 */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground select-none">键帽编辑</span>
            <span className="text-[11px] text-muted-foreground/50">/</span>
            <span className="text-[12px] font-medium text-foreground select-none">
              {labelText || keyDef.keyId}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="关闭 (Esc)"
          >
            <X className="size-3.5" />
          </Button>
        </div>

        {/* 主体区：SVG 预览（左）+ 右侧控制栏 */}
        <div className="flex flex-1 min-h-0">
          {/* SVG 预览区 */}
          <div
            className="relative flex items-center justify-center"
            style={{ padding: "48px 56px" }}
            onClick={() => { setSelectedImageId(null); setSelectedLabel(false) }}
          >
            <div
              ref={overlayContainerRef}
              className="relative"
              style={{ width: viewW, height: viewH }}
            >
              <svg
                ref={svgRef}
                width={viewW}
                height={viewH}
                viewBox={`0 0 ${vbW} ${vbH}`}
                style={{ display: "block", overflow: "visible" }}
                onDragOver={handleSvgDragOver}
                onDragLeave={handleSvgDragLeave}
                onDrop={handleSvgDrop}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedLabel(false)
                  setSelectedImageId(null)
                }}
              >
                <defs>
                  {/* 键帽底座轮廓裁切区域 */}
                  <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                    {isIso
                      ? <path d={roundedPolygonPath(getIsoBasePoints(0, 0, pw, ph), KEY_RADIUS_BASE)} />
                      : <rect x={0} y={0} width={pw} height={ph} rx={KEY_RADIUS_BASE} />
                    }
                  </clipPath>
                  {/* 键帽顶面（top face）裁切区域 */}
                  <clipPath id={`${clipId}-top`} clipPathUnits="userSpaceOnUse">
                    {isIso
                      ? <path d={roundedPolygonPath(getIsoTopFacePoints(0, 0, pw, ph), getIsoTopFaceRadii(KEY_RADIUS_TOP))} />
                      : <rect x={topX} y={topY} width={topW} height={topH} rx={KEY_RADIUS_TOP} />
                    }
                  </clipPath>
                  <filter id={`${clipId}-shadow`} x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
                  </filter>
                </defs>

                <g transform={`translate(${MODAL_VIEW_INSET}, ${MODAL_VIEW_INSET})`}>
                  {/* 键帽底座 */}
                  {isIso
                    ? (
                      <path
                        d={roundedPolygonPath(getIsoBasePoints(0, 0, pw, ph), KEY_RADIUS_BASE)}
                        fill={baseFill}
                        stroke={borderColor}
                        strokeWidth={0.8 / modalScale}
                      />
                    ) : (
                      <rect
                        x={0} y={0} width={pw} height={ph}
                        rx={KEY_RADIUS_BASE}
                        fill={baseFill}
                        stroke={borderColor}
                        strokeWidth={0.8 / modalScale}
                      />
                    )
                  }

                  {/* 键帽顶面 */}
                  {isIso
                    ? (
                      <path
                        d={roundedPolygonPath(getIsoTopFacePoints(0, 0, pw, ph), getIsoTopFaceRadii(KEY_RADIUS_TOP))}
                        fill={topFill}
                        style={{ pointerEvents: "none" }}
                      />
                    ) : (
                      <rect
                        x={topX} y={topY} width={topW} height={topH}
                        rx={KEY_RADIUS_TOP}
                        fill={topFill}
                        style={{ pointerEvents: "none" }}
                      />
                    )
                  }

                  {/* 动态渲染子组件 KeycapEditorImageElement 图层组 */}
                  {keycapImages.map((img) => (
                    <KeycapEditorImageElement
                      key={img.id}
                      img={img}
                      clipMode={img.clipToTopFace ? "top" : img.clipToKeycap ? "base" : "none"}
                      isSelected={selectedImageId === img.id}
                      scale={modalScale}
                      clipId={clipId}
                      topFaceClipId={`${clipId}-top`}
                      svgRef={svgRef}
                      overlayContainerRef={overlayContainerRef}
                      onSelect={() => {
                        setSelectedImageId(img.id)
                        setSelectedLabel(false)
                      }}
                      onCycleClipMode={() => handleCycleImageClipMode(img.id, img.clipToKeycap, img.clipToTopFace)}
                      onCenterToTopFace={() => {
                        const centerX = topX + topW / 2 - img.width / 2
                        const centerY = topY + topH / 2 - img.height / 2
                        handleImageCommit(img.id, { x: centerX, y: centerY })
                      }}
                      onCommit={handleImageCommit}
                    />
                  ))}

                  {/* 模拟内凹高光，提升 3D 质感 */}
                  {isIso
                    ? (
                      <path
                        d={roundedPolygonPath(getIsoTopFacePoints(0, 0, pw, ph), getIsoTopFaceRadii(KEY_RADIUS_TOP))}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={0.6 / modalScale}
                        style={{ pointerEvents: "none" }}
                      />
                    ) : (
                      <rect
                        x={topX} y={topY} width={topW} height={topH}
                        rx={KEY_RADIUS_TOP}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={0.6 / modalScale}
                        style={{ pointerEvents: "none" }}
                      />
                    )
                  }

                  {/* 刻字文本节点 */}
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
                    {letterSpacing !== 0
                      ? labelLines.length > 1
                        ? labelLines.map((line, i) => (
                            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
                              {renderChars(line || "\u00A0")}
                            </tspan>
                          ))
                        : renderChars(labelText)
                      : labelLines.length > 1
                        ? labelLines.map((line, i) => (
                            <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
                              {line || "\u00A0"}
                            </tspan>
                          ))
                        : labelText}
                  </text>

                  {/* 十字辅助线（ISO 形状不支持，stepped 及其余键帽可切换） */}
                  {showCrosshair && !isIso && (
                    <g style={{ pointerEvents: "none" }}>
                      <line
                        x1={topX} y1={topY + topH / 2}
                        x2={topX + topW} y2={topY + topH / 2}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeWidth={0.8 / modalScale}
                        strokeDasharray={`${3 / modalScale} ${3 / modalScale}`}
                      />
                      <line
                        x1={topX + topW / 2} y1={topY}
                        x2={topX + topW / 2} y2={topY + topH}
                        stroke="var(--muted-foreground)"
                        strokeOpacity={0.35}
                        strokeWidth={0.8 / modalScale}
                        strokeDasharray={`${3 / modalScale} ${3 / modalScale}`}
                      />
                      <circle
                        cx={topX + topW / 2}
                        cy={topY + topH / 2}
                        r={1.5 / modalScale}
                        fill="var(--muted-foreground)"
                        fillOpacity={0.4}
                      />
                    </g>
                  )}

                  {/* 刻字交互热区及选中态虚线框 */}
                  {textBBox && (
                    <rect
                      x={textBBox.x - 6}
                      y={textBBox.y - 4}
                      width={textBBox.width + 12}
                      height={textBBox.height + 8}
                      rx={3 / modalScale}
                      fill="transparent"
                      stroke={
                        selectedLabel
                          ? "var(--design-selection-border)"
                          : isLabelHovered
                            ? "var(--border)"
                            : "transparent"
                      }
                      strokeOpacity={selectedLabel ? 0.65 : isLabelHovered ? 1 : 1}
                      strokeWidth={1.5 / modalScale}
                      strokeDasharray={
                        selectedLabel
                          ? `${4 / modalScale} ${3 / modalScale}`
                          : undefined
                      }
                      style={{ cursor: selectedLabel ? "move" : "pointer" }}
                      onMouseEnter={() => setIsLabelHovered(true)}
                      onMouseLeave={() => setIsLabelHovered(false)}
                      onMouseDown={(e) => {
                        if (!selectedLabel) {
                          e.stopPropagation()
                          setSelectedLabel(true)
                          setSelectedImageId(null)
                        } else {
                          handleLabelAreaMouseDown(e)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </g>
              </svg>
            </div>

            {/* 拖拽上传蒙层 */}
            {isDragOver && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-primary/70 bg-primary/10"
              >
                <span className="rounded border border-border bg-popover/90 px-2 py-1 text-xs text-primary select-none backdrop-blur-sm">
                  释放文件以上传
                </span>
              </div>
            )}
          </div>

          {/* 右侧文字控制栏 */}
          <div
            className="flex w-[180px] flex-col gap-4 overflow-y-auto border-l border-border px-4 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 刻字内容 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground select-none">刻字</span>
              <Textarea
                value={labelText}
                onChange={(e) =>
                  setKeycapOverride(layerId, keyId, { labelText: e.target.value })
                }
                placeholder="输入刻字，支持换行"
                style={{ fontFamily: labelFontFamily, lineHeight: "1.5" }}
                className="text-xs"
              />
            </div>

            {/* 字间距 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground select-none">字间距</span>
              <Input
                type="number"
                min={-3}
                max={10}
                step={0.5}
                value={letterSpacing}
                onChange={(e) =>
                  setKeycapOverride(layerId, keyId, { letterSpacing: Number(e.target.value) })
                }
                className="h-7 text-xs tabular-nums"
              />
            </div>

            {/* 行距 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground select-none">行距</span>
              <Input
                type="number"
                min={0.8}
                max={3}
                step={0.1}
                value={Number(lineHeightRatio.toFixed(1))}
                onChange={(e) =>
                  setKeycapOverride(layerId, keyId, { lineHeightRatio: Number(e.target.value) })
                }
                className="h-7 text-xs tabular-nums"
              />
            </div>

            {/* 文字位置九宫格 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground select-none">文字位置</span>
              <LabelAlignmentGrid hideLabel onAlign={handleAlign} />
            </div>

            {/* 文字颜色 */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-muted-foreground select-none">文字颜色</span>
              <ColorRow
                label="文字颜色"
                hideLabel
                value={override?.labelColor ?? ""}
                fallback={globalDefaults.labelColor ?? DEFAULT_KEYCAP_COLORS.labelColor}
                onChange={(next) => setKeycapOverride(layerId, keyId, { labelColor: next })}
              />
            </div>
          </div>
        </div>

        {/* 底部操作工具栏 */}
        <div className="flex items-center gap-1 border-t border-border px-4 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto gap-1.5 px-2.5 py-1.5 text-[12px]"
            onClick={() => fileInputRef.current?.click()}
            title="添加本地图片"
          >
            <ImagePlus className="size-3.5" />
            上传图片
          </Button>

          {!isIso && (
            <Button
              type="button"
              variant={showCrosshair ? "secondary" : "ghost"}
              size="sm"
              className="h-auto gap-1.5 px-2.5 py-1.5 text-[12px]"
              onClick={() => setShowCrosshair((v) => !v)}
              title="切换十字辅助线"
            >
              <Crosshair className="size-3.5" />
              辅助线
            </Button>
          )}

          {selectedImageId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto gap-1.5 px-2.5 py-1.5 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                removeCanvasElement(selectedImageId)
                setSelectedImageId(null)
              }}
              title="删除图片 (Del)"
            >
              <Trash2 className="size-3.5" />
              删除图片
            </Button>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/60 select-none">
            <Move className="size-3" />
            <span>拖拽调整位置，选中后方向键微调</span>
          </div>
        </div>

        {/* 隐藏的文件上传探针 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.svg"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  )
}