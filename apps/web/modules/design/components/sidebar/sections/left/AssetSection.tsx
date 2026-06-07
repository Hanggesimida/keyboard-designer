"use client"

import { useRef, useCallback, useMemo, useState, useEffect } from "react"
import { ImagePlus, Trash2, Spline } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useDesignUIStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { PanelSection } from "../../panel-section"
import { isSvgFile, readSvgFile } from "@/modules/design/lib/design/svgUtils"

// ─── 图片缩略图行 ──────────────────────────────────────
interface AssetRowProps {
  element: CanvasImageElement
  src: string
  isSelected: boolean
  keyLabelMap: Record<string, string>
  onSelect: () => void
  onDelete: () => void
  onResize: (w: number, h: number) => void
}

function AssetRow({ element, src, isSelected, keyLabelMap, onSelect, onDelete, onResize }: AssetRowProps) {
  const keyLabel = element.clipToKeycapId
    ? (keyLabelMap[element.clipToKeycapId] ?? element.clipToKeycapId)
    : null

  const [wVal, setWVal] = useState(String(Math.round(element.width)))
  const [hVal, setHVal] = useState(String(Math.round(element.height)))

  useEffect(() => {
    setWVal(String(Math.round(element.width)))
  }, [element.width])

  useEffect(() => {
    setHVal(String(Math.round(element.height)))
  }, [element.height])

  const commitResize = useCallback((rawW: string, rawH: string) => {
    const w = parseInt(rawW, 10)
    const h = parseInt(rawH, 10)
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onResize(w, h)
    } else {
      setWVal(String(Math.round(element.width)))
      setHVal(String(Math.round(element.height)))
    }
  }, [onResize, element.width, element.height])

  const handleWKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.currentTarget.blur() }
    if (e.key === "Escape") {
      setWVal(String(Math.round(element.width)))
      e.currentTarget.blur()
    }
  }

  const handleHKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.currentTarget.blur() }
    if (e.key === "Escape") {
      setHVal(String(Math.round(element.height)))
      e.currentTarget.blur()
    }
  }

  return (
    <li
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 transition-colors",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {/* 缩略图 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="size-8 shrink-0 rounded-sm object-cover"
        style={{ imageRendering: "auto" }}
      />

      {/* 标签：键帽图片显示所属键名，普通图片显示可编辑尺寸 */}
      <span className="min-w-0 flex-1 text-[11px]">
        {keyLabel !== null ? (
          <span className="flex items-baseline gap-1">
            <span className="opacity-40">键帽</span>
            <span className="font-medium">{keyLabel}</span>
          </span>
        ) : (
          <span className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <input
              type="number"
              value={wVal}
              min={1}
              onChange={(e) => setWVal(e.target.value)}
              onBlur={() => commitResize(wVal, hVal)}
              onKeyDown={handleWKeyDown}
              className="w-10 rounded bg-transparent px-0.5 text-center text-[11px] tabular-nums outline-none ring-1 ring-transparent focus:ring-border"
              title="宽度（px）"
            />
            <span className="opacity-40">×</span>
            <input
              type="number"
              value={hVal}
              min={1}
              onChange={(e) => setHVal(e.target.value)}
              onBlur={() => commitResize(wVal, hVal)}
              onKeyDown={handleHKeyDown}
              className="w-10 rounded bg-transparent px-0.5 text-center text-[11px] tabular-nums outline-none ring-1 ring-transparent focus:ring-border"
              title="高度（px）"
            />
          </span>
        )}
      </span>

      {/* 删除按钮（hover 时显示） */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 cursor-pointer"
        title="删除图片"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="size-3" />
      </Button>
    </li>
  )
}

// ─── 素材区主组件 ──────────────────────────────────────
export function AssetSection() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const svgInputRef = useRef<HTMLInputElement>(null)
  const { allKeys } = useLayoutKeys()
  const keyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const k of allKeys) map[k.keyId] = k.label
    return map
  }, [allKeys])
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const assetMap = useDesignUIStore((s) => s.assetMap)
  const selectedElementId = useDesignUIStore((s) => s.selectedElementId)
  const addAsset = useDesignUIStore((s) => s.addAsset)
  const addCanvasElement = useDesignUIStore((s) => s.addCanvasElement)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const setSelectedElementId = useDesignUIStore((s) => s.setSelectedElementId)

  const imageElements = canvasElements.filter(
    (el): el is CanvasImageElement => el.type === "image",
  )

  const addImageFile = useCallback(
    (file: File) => {
      if (isSvgFile(file)) {
        readSvgFile(file).then((result) => {
          if (!result) return
          const assetId = addAsset(result.src)
          const defaultW = Math.min(result.w, 400)
          const defaultH = Math.round((defaultW / result.w) * result.h)
          addCanvasElement({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: "image",
            assetId,
            x: 40,
            y: 40,
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
          const defaultW = Math.min(img.width, 400)
          const defaultH = Math.round((defaultW / img.width) * img.height)
          addCanvasElement({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: "image",
            assetId,
            x: 40,
            y: 40,
            width: defaultW,
            height: defaultH,
            opacity: 1,
            locked: false,
          })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    },
    [addAsset, addCanvasElement],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter(
        (f) => f.type.startsWith("image/") || isSvgFile(f),
      )
      files.forEach(addImageFile)
      e.target.value = ""
    },
    [addImageFile],
  )

  return (
    <PanelSection
      title="素材"
      action={
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="上传矢量图形（SVG）"
            onClick={() => svgInputRef.current?.click()}
          >
            <Spline className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
            title="上传图片（PNG / JPG 等）"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
          </Button>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={svgInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {imageElements.length === 0 ? (
        <button
          type="button"
          className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-border/50 py-4 text-muted-foreground/50 transition-colors hover:border-border hover:text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-5" />
          <span className="text-[11px]">点击上传 / 拖入画布</span>
        </button>
      ) : (
        <ul className="flex flex-col gap-px">
          {imageElements.map((el) => (
            <AssetRow
              key={el.id}
              element={el}
              src={assetMap[el.assetId] ?? ""}
              isSelected={selectedElementId === el.id}
              keyLabelMap={keyLabelMap}
              onSelect={() => setSelectedElementId(el.id)}
              onDelete={() => removeCanvasElement(el.id)}
              onResize={(w, h) => updateCanvasElement(el.id, { width: w, height: h })}
            />
          ))}
        </ul>
      )}
    </PanelSection>
  )
}
