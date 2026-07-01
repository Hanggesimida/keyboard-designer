"use client"

import { Image as ImageIcon } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useDesignUIStore, type CanvasElement } from "@/modules/design/store/designUiStore"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { ZIndexBadge, LayerControls, SectionHeader, SectionFooter } from "./LayerPrimitives"

// ─── 单行图片行 ────────────────────────────────────────
interface CanvasImageRowProps {
  element: CanvasElement
  src: string
  zIndex: number
  total: number
  isSelected: boolean
  keysById: Map<string, { label: string }>
  onSelect: () => void
  onMoveUp: (e: React.MouseEvent) => void
  onMoveDown: (e: React.MouseEvent) => void
  onToggleVisible: (e: React.MouseEvent) => void
  onToggleLocked: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}

function CanvasImageRow({
  element,
  src,
  zIndex,
  total,
  isSelected,
  keysById,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onToggleLocked,
  onRemove,
}: CanvasImageRowProps) {
  const isVisible = element.opacity > 0
  const isLocked = element.type === "image" ? element.locked : false
  const opacityPct = Math.round(element.opacity * 100)

  return (
    <li
      onClick={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 transition-colors",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <ZIndexBadge index={zIndex} />

      {element.type === "image" && src ? (
        <img
          src={src}
          alt=""
          className={cn(
            "h-5 w-5 shrink-0 rounded-sm object-cover ring-1 ring-border/50",
            !isVisible && "opacity-30",
          )}
        />
      ) : (
        <ImageIcon className="size-3 shrink-0 text-chart-2/70" />
      )}

      {element.type === "image" && element.clipToKeycapId && (
        // TooltipProvider 已由父级 CanvasImagesSection 提供
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="h-3.5 shrink-0 border-indigo-500/35 bg-indigo-500/10 px-1 text-[8px] font-normal text-indigo-400 cursor-default"
            >
              {keysById.get(element.clipToKeycapId)?.label ?? element.clipToKeycapId}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px]">
            裁剪到键帽：{element.clipToKeycapId}
          </TooltipContent>
        </Tooltip>
      )}

      <div className="flex-1" />

      {!isVisible && (
        <Badge
          variant="outline"
          className="h-4 border-border px-0.5 text-[9px] font-normal text-muted-foreground shrink-0"
        >
          隐藏
        </Badge>
      )}
      {isVisible && element.opacity < 1 && (
        <Badge
          variant="outline"
          className="h-4 border-border px-0.5 text-[9px] font-normal text-muted-foreground/60"
        >
          {opacityPct}%
        </Badge>
      )}

      <LayerControls
        canMoveUp={zIndex > 1}
        canMoveDown={zIndex < total}
        canRemove={true}
        isVisible={isVisible}
        isLocked={isLocked}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onToggleVisible={onToggleVisible}
        onToggleLocked={onToggleLocked}
        onRemove={onRemove}
      />
    </li>
  )
}

// ─── 画布图片区 ────────────────────────────────────────
// canvasElements 末尾 = 最顶层，面板中反序展示（顶层在上）
export function CanvasImagesSection() {
  const { keysById } = useLayoutKeys()
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const assetMap = useDesignUIStore((s) => s.assetMap)
  const selectedElementId = useDesignUIStore((s) => s.selectedElementId)
  const setSelectedElementId = useDesignUIStore((s) => s.setSelectedElementId)
  const removeCanvasElement = useDesignUIStore((s) => s.removeCanvasElement)
  const updateCanvasElement = useDesignUIStore((s) => s.updateCanvasElement)
  const reorderCanvasElement = useDesignUIStore((s) => s.reorderCanvasElement)

  if (canvasElements.length === 0) return null

  const reversed = [...canvasElements].reverse()
  const total = canvasElements.length

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col gap-px">
      <SectionHeader
        label="画布图片"
        tooltip="画布图片浮于键盘层之上，始终在键帽设计层的上方显示。列表中越靠上表示层叠越高。"
      />
      <ul className="flex flex-col gap-px">
        {reversed.map((el, i) => {
          const zIndex = i + 1
          return (
            <CanvasImageRow
              key={el.id}
              element={el}
              src={el.type === "image" ? (assetMap[el.assetId] ?? "") : ""}
              zIndex={zIndex}
              total={total}
              isSelected={selectedElementId === el.id}
              keysById={keysById}
              onSelect={() => setSelectedElementId(el.id)}
              onMoveUp={(e) => { e.stopPropagation(); reorderCanvasElement(el.id, "up") }}
              onMoveDown={(e) => { e.stopPropagation(); reorderCanvasElement(el.id, "down") }}
              onToggleVisible={(e) => {
                e.stopPropagation()
                if (el.type === "image") {
                  updateCanvasElement(el.id, { opacity: el.opacity === 0 ? 1 : 0 })
                }
              }}
              onToggleLocked={(e) => {
                e.stopPropagation()
                if (el.type === "image") {
                  updateCanvasElement(el.id, { locked: !el.locked })
                }
              }}
              onRemove={(e) => { e.stopPropagation(); removeCanvasElement(el.id) }}
            />
          )
        })}
      </ul>
      <SectionFooter label="↕ 上方始终覆盖键帽层" />
    </div>
    </TooltipProvider>
  )
}
