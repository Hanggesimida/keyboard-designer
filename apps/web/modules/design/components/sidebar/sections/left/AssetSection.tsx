"use client"

import { useRef, useCallback, useMemo } from "react"
import { ImagePlus, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useDesignUIStore, type CanvasImageElement } from "@/modules/design/store/designUiStore"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { PanelSection } from "../../panel-section"

// ─── 图片缩略图行 ──────────────────────────────────────
interface AssetRowProps {
  element: CanvasImageElement
  isSelected: boolean
  keyLabelMap: Record<string, string>
  onSelect: () => void
  onDelete: () => void
}

function AssetRow({ element, isSelected, keyLabelMap, onSelect, onDelete }: AssetRowProps) {
  const keyLabel = element.clipToKeycapId
    ? (keyLabelMap[element.clipToKeycapId] ?? element.clipToKeycapId)
    : null

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
        src={element.src}
        alt=""
        className="size-8 shrink-0 rounded-sm object-cover"
        style={{ imageRendering: "auto" }}
      />

      {/* 标签：键帽图片显示所属键名，普通图片显示像素尺寸 */}
      <span className="min-w-0 flex-1 truncate text-[11px]">
        {keyLabel !== null ? (
          <span className="flex items-baseline gap-1">
            <span className="opacity-40">键帽</span>
            <span className="font-medium">{keyLabel}</span>
          </span>
        ) : (
          `${Math.round(element.width)} × ${Math.round(element.height)}`
        )}
      </span>

      {/* 删除按钮（hover 时显示） */}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
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
  const { allKeys } = useLayoutKeys()
  const keyLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const k of allKeys) map[k.keyId] = k.label
    return map
  }, [allKeys])
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const selectedElementId = useDesignUIStore((s) => s.selectedElementId)
  const addCanvasElement = useDesignUIStore((s) => s.addCanvasElement)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const setSelectedElementId = useDesignUIStore((s) => s.setSelectedElementId)

  const imageElements = canvasElements.filter(
    (el): el is CanvasImageElement => el.type === "image",
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []).filter((f) =>
        f.type.startsWith("image/"),
      )
      files.forEach((file) => {
        const reader = new FileReader()
        reader.onload = (ev) => {
          const src = ev.target?.result as string
          if (!src) return
          const img = new Image()
          img.onload = () => {
            const defaultW = Math.min(img.width, 400)
            const defaultH = Math.round((defaultW / img.width) * img.height)
            const element: CanvasImageElement = {
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: "image",
              src,
              x: 40,
              y: 40,
              width: defaultW,
              height: defaultH,
              opacity: 1,
              locked: false,
            }
            addCanvasElement(element)
          }
          img.src = src
        }
        reader.readAsDataURL(file)
      })
      // 清空 input，允许重复选同一文件
      e.target.value = ""
    },
    [addCanvasElement],
  )

  return (
    <PanelSection
      title="素材"
      action={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          title="上传图片"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="size-3.5" />
        </Button>
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
              isSelected={selectedElementId === el.id}
              keyLabelMap={keyLabelMap}
              onSelect={() => setSelectedElementId(el.id)}
              onDelete={() => removeCanvasElement(el.id)}
            />
          ))}
        </ul>
      )}
    </PanelSection>
  )
}
