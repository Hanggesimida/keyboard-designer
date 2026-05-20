"use client"

import { useRef, useState, useEffect, useLayoutEffect, useCallback, useId } from "react"
import { X, ImagePlus, Trash2, Move } from "lucide-react"
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
  clamp,
} from "@/modules/design/lib/design/keycapGeometry"
import { SvgImageElement, MODAL_VIEW_INSET, type KeycapEditorImage } from "./SvgImageElement"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

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
  const addCanvasElement = useDesignUIStore((s) => s.addCanvasElement)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const setKeycapOverride = useDesignUIStore((s) => s.setKeycapOverride)

  const rawId = useId()
  const clipId = rawId.replace(/[^a-zA-Z0-9_-]/g, "-")

  const svgRef = useRef<SVGSVGElement>(null)
  const overlayContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedLabel, setSelectedLabel] = useState(false)
  const [isLabelHovered, setIsLabelHovered] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // 3. 动态计算文本 BBox 用于绘制选中边框
  const textRef = useRef<SVGTextElement>(null)
  const [textBBox, setTextBBox] = useState<DOMRect | null>(null)

  useLayoutEffect(() => {
    if (textRef.current) {
      try {
        setTextBBox(textRef.current.getBBox())
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
  // 键帽顶部触面的 viewBox 映射
  const topX = KEY_PAD_LEFT
  const topY = KEY_PAD_TOP
  const topW = pw - KEY_PAD_LEFT - KEY_PAD_RIGHT
  const topH = ph - KEY_PAD_TOP - KEY_PAD_BOTTOM

  // 5. 键帽默认样式及覆写样式读取
  const baseFill = override?.bgColor ?? globalDefaults.bgColor ?? "#3c3c3c"
  const topFill = override?.topColor ?? globalDefaults.topColor ?? "#4a4a4a"
  const borderColor = override?.borderColor ?? globalDefaults.borderColor ?? "#222222"
  const labelText = override?.labelText ?? keyDef.label
  const labelColor = override?.labelColor ?? globalDefaults.labelColor ?? "#d0d0d0"
  const fontSize = override?.fontSize ?? globalDefaults.fontSize ?? KEY_LABEL_SIZE
  const labelFontFamily = override?.fontFamily ?? fontFamily ?? "Inter, system-ui, sans-serif"
  const letterSpacing = override?.letterSpacing ?? 0
  const lineHeightRatio = override?.lineHeightRatio ?? 1.2

  // 6. 将当前键帽的绝对坐标转换为内部相对坐标
  // 轴心公式 = artPad + keyDef.x * unit + GAP/2
  const keycapArtX = artPad + keyDef.x * unit + GAP / 2
  const keycapArtY = artPad + keyDef.y * unit + GAP / 2

  // 7. 过滤并格式化属于当前键帽的图片元素
  const keycapImages = canvasElements
    .filter((el): el is CanvasImageElement => el.type === "image" && el.clipToKeycapId === keyId)
    .map((el) => ({
      id: el.id,
      src: el.src,
      x: el.x - keycapArtX,
      y: el.y - keycapArtY,
      width: el.width,
      height: el.height,
      opacity: el.opacity,
      rotation: el.rotation,
      clipToKeycap: el.clipToKeycaps ?? true,
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

  // 10. 全局快捷键监听（Esc 关闭，Delete/Backspace 删除图片）
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
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, selectedImageId, removeCanvasElement])

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

  const handleToggleImageClip = useCallback(
    (imgId: string, clipToKeycap: boolean) => {
      updateCanvasElement(imgId, { clipToKeycaps: !clipToKeycap })
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
      files
        .filter((f) => f.type.startsWith("image/"))
        .forEach((file) => {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const src = ev.target?.result as string
            if (!src) return
            const domImg = new Image()
            domImg.onload = () => {
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
                src,
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
    [addCanvasElement, keyId, pw, ph, keycapArtX, keycapArtY],
  )

  // 15. 外部元素拖拽进入 SVG 画布事件
  const handleSvgDragOver = useCallback((e: React.DragEvent<SVGSVGElement>) => {
    const hasImage = Array.from(e.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      {/* 弹窗主体 */}
      <div
        className="relative flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "#141414",
          border: "1px solid rgba(255,255,255,0.08)",
          minWidth: Math.max(viewW + 128, 300),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部状态栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-white/40 select-none">键帽编辑</span>
            <span className="text-[11px] text-white/20">/</span>
            <span className="text-[12px] font-medium text-white/80 select-none">
              {labelText || keyDef.keyId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
            title="关闭 (Esc)"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* 核心键盘组件 SVG 预览与编辑区 */}
        <div
          className="relative flex items-center justify-center"
          style={{ padding: "52px 64px" }}
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
                <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                  <rect x={0} y={0} width={pw} height={ph} rx={KEY_RADIUS_BASE} />
                </clipPath>
                <filter id={`${clipId}-shadow`} x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              <g transform={`translate(${MODAL_VIEW_INSET}, ${MODAL_VIEW_INSET})`}>
                {/* 键帽底座 */}
                <rect
                  x={0} y={0} width={pw} height={ph}
                  rx={KEY_RADIUS_BASE}
                  fill={baseFill}
                  stroke={borderColor}
                  strokeWidth={0.8 / modalScale}
                />

                {/* 键帽顶面 */}
                <rect
                  x={topX} y={topY} width={topW} height={topH}
                  rx={KEY_RADIUS_TOP}
                  fill={topFill}
                  style={{ pointerEvents: "none" }}
                />

                {/* 动态渲染子组件 SvgImageElement 图层组 */}
                {keycapImages.map((img) => (
                  <SvgImageElement
                    key={img.id}
                    img={img}
                    clipToKeycap={img.clipToKeycap}
                    isSelected={selectedImageId === img.id}
                    scale={modalScale}
                    clipId={clipId}
                    svgRef={svgRef}
                    overlayContainerRef={overlayContainerRef}
                    onSelect={() => {
                      setSelectedImageId(img.id)
                      setSelectedLabel(false)
                    }}
                    onToggleClipToKeycap={() => handleToggleImageClip(img.id, img.clipToKeycap)}
                    onCommit={handleImageCommit}
                  />
                ))}

                {/* 模拟内凹高光，提升 3D 质感 */}
                <rect
                  x={topX} y={topY} width={topW} height={topH}
                  rx={KEY_RADIUS_TOP}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={0.6 / modalScale}
                  style={{ pointerEvents: "none" }}
                />

                {/* 刻字文本节点 */}
                <text
                  ref={textRef}
                  x={textX}
                  y={textYDraw}
                  fontSize={fontSize}
                  fill={labelColor}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ userSelect: "none", pointerEvents: "none", fontFamily: labelFontFamily, letterSpacing }}
                >
                  {labelLines.length > 1
                    ? labelLines.map((line, i) => (
                      <tspan key={i} x={textX} dy={i === 0 ? 0 : lineHeight}>
                        {line || "\u00A0"}
                      </tspan>
                    ))
                    : labelText}
                </text>

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
                        ? "rgba(99,179,237,0.65)"
                        : isLabelHovered
                          ? "rgba(255,255,255,0.18)"
                          : "transparent"
                    }
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
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded"
              style={{
                border: "2px dashed rgba(59,130,246,0.7)",
                backgroundColor: "rgba(59,130,246,0.08)",
              }}
            >
              <span className="text-xs text-blue-300 rounded px-2 py-1 select-none"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                释放文件以上传
              </span>
            </div>
          )}
        </div>

        {/* 刻字编辑栏 */}
        <div className="flex gap-3 px-4 py-3 border-t border-white/8 items-start">
          <span className="text-[11px] text-white/40 shrink-0 select-none mt-1.5">刻字</span>

          {/* 文本输入框 */}
          <Textarea
            className="flex-1"
            value={labelText}
            onChange={(e) =>
              setKeycapOverride(layerId, keyId, { labelText: e.target.value })
            }
            placeholder="输入刻字，支持换行"
            style={{ fontFamily: labelFontFamily, lineHeight: "1.5" }}
          />

          {/* 字间距 + 行距 数字输入区，上下排列 */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* 字间距 */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 select-none">
              <span className="shrink-0 w-[3em] text-right">字间距</span>
              <Input
                type="number"
                min={-3}
                max={10}
                step={0.5}
                value={letterSpacing}
                onChange={(e) =>
                  setKeycapOverride(layerId, keyId, { letterSpacing: Number(e.target.value) })
                }
              />
            </div>

            {/* 行距 */}
            <div className="flex items-center gap-1.5 text-[11px] text-white/40 select-none">
              <span className="shrink-0 w-[3em] text-right">行距</span>
              <Input
                type="number"
                min={0.8}
                max={3}
                step={0.1}
                value={Number(lineHeightRatio.toFixed(1))}
                onChange={(e) =>
                  setKeycapOverride(layerId, keyId, { lineHeightRatio: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </div>

        {/* 底部操作工具栏 */}
        <div className="flex items-center gap-1 px-4 py-2.5 border-t border-white/8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12px] text-white/50 hover:text-white hover:bg-white/8 transition-colors select-none"
            title="添加本地图片"
          >
            <ImagePlus className="size-3.5" />
            上传图片
          </button>

          {selectedImageId && (
            <button
              onClick={() => {
                removeCanvasElement(selectedImageId)
                setSelectedImageId(null)
              }}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors select-none"
              title="删除图片 (Del)"
            >
              <Trash2 className="size-3.5" />
              删除图片
            </button>
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-1 text-[11px] text-white/20 select-none">
            <Move className="size-3" />
            <span>支持拖拽图片、刻字调整位置</span>
          </div>
        </div>

        {/* 底部功能提示栏 */}
        <div className="px-4 pb-3 pt-0 text-[10px] text-white/18 select-none">
          提示：拖动文件到键帽可以直接上传。按 Esc 退出编辑，按 Del 或 Backspace 键删除选中图片。
        </div>

        {/* 隐藏的文件上传探针 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>
    </div>
  )
}