"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, ChevronRight, Image as ImageIcon } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useDesignUIStore, type KeycapOverride, type Layer } from "@/modules/design/store/designUiStore"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import { ZIndexBadge, LayerControls, SectionHeader } from "./LayerPrimitives"

interface KeyDef { keyId: string; label: string }

/** 稳定的空 overrides 对象，避免每次渲染产生新引用导致子组件 memo 失效 */
const EMPTY_LAYER_OVERRIDES: Record<string, KeycapOverride> = {}

// ─── 键帽子行 ──────────────────────────────────────────
interface KeycapSubRowProps {
  keyDef: KeyDef
  isSelected: boolean
  hasOverride: boolean
  hasImages: boolean
  onSelect: (shiftKey: boolean) => void
  onEnterEdit: () => void
}

function KeycapSubRow({ keyDef, isSelected, hasOverride, hasImages, onSelect, onEnterEdit }: KeycapSubRowProps) {
  const t = useTranslations("Design.layers")

  return (
    <li
      onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey) }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onEnterEdit()
      }}
      className={cn(
        "group flex cursor-pointer select-none items-center gap-1 rounded-md py-0.5 pl-8 pr-1 transition-colors",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <span className="min-w-0 flex-1 truncate px-0.5 text-[11px]">
        {keyDef.label || keyDef.keyId}
      </span>
      {hasImages && (
        // TooltipProvider 已由父级 KeycapLayerTreeNode 提供，无需每行实例化
        <Tooltip>
          <TooltipTrigger render={<button type="button" className="inline-flex cursor-default" />}>
            <ImageIcon className="size-2.5 shrink-0 text-chart-2/70" />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px]">
            {t("hasEmbeddedImage")}
          </TooltipContent>
        </Tooltip>
      )}
      {hasOverride && (
        <Badge
          variant="outline"
          className="h-3.5 border-primary/35 bg-primary/10 px-1 text-[8px] font-normal text-primary"
        >
          {t("modified")}
        </Badge>
      )}
    </li>
  )
}

// ─── 键帽设计层行 ──────────────────────────────────────
interface KeycapLayerRowProps {
  layer: Layer
  zIndex: number
  total: number
  isActive: boolean
  isExpanded: boolean
  onActivate: () => void
  onToggleExpand: (e: React.MouseEvent) => void
  onMoveUp: (e: React.MouseEvent) => void
  onMoveDown: (e: React.MouseEvent) => void
  onToggleVisible: (e: React.MouseEvent) => void
  onToggleLocked: (e: React.MouseEvent) => void
  onToggleLabelsHidden: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
}

function KeycapLayerRow({
  layer,
  zIndex,
  total,
  isActive,
  isExpanded,
  onActivate,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onToggleLocked,
  onToggleLabelsHidden,
  onRemove,
}: KeycapLayerRowProps) {
  const t = useTranslations("Design.layers")
  const displayName = layer.id === "layer-default-keycap" ? t("defaultName") : layer.name

  return (
    <li
      onClick={onActivate}
      className={cn(
        "group flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50",
      )}
    >
      <ZIndexBadge index={zIndex} />

      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
        title={isExpanded ? t("collapseKeys") : t("expandKeys")}
        onClick={onToggleExpand}
      >
        {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
      </Button>

      <span
        className={cn(
          "min-w-0 flex-1 truncate px-0.5 text-left text-[12px]",
          !layer.visible && "opacity-40",
        )}
      >
        {displayName}
      </span>

      {!layer.visible && (
        <Badge
          variant="outline"
          className="h-4 border-border px-1 text-[9px] font-normal text-muted-foreground shrink-0"
        >
          {t("hidden")}
        </Badge>
      )}
      {layer.locked && (
        <Badge
          variant="outline"
          className="h-4 border-chart-4/35 bg-chart-4/10 px-1 text-[9px] font-normal text-chart-4 shrink-0"
        >
          {t("locked")}
        </Badge>
      )}

      <LayerControls
        canMoveUp={zIndex > 1}
        canMoveDown={zIndex < total}
        canRemove={total > 1}
        isVisible={layer.visible}
        isLocked={layer.locked}
        labelsHidden={layer.labelsHidden}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onToggleVisible={onToggleVisible}
        onToggleLocked={onToggleLocked}
        onToggleLabelsHidden={onToggleLabelsHidden}
        onRemove={onRemove}
      />
    </li>
  )
}

// ─── 键帽设计层树节点（含可展开子键帽列表） ──────────
interface KeycapLayerTreeNodeProps {
  layer: Layer
  zIndex: number
  total: number
  isActive: boolean
  isExpanded: boolean
  selectedKeycapIds: string[]
  layerOverrides: Record<string, KeycapOverride>
  keycapIdsWithImages: Set<string>
  allKeys: KeyDef[]
  onActivate: () => void
  onToggleExpand: () => void
  onMoveUp: (e: React.MouseEvent) => void
  onMoveDown: (e: React.MouseEvent) => void
  onToggleVisible: (e: React.MouseEvent) => void
  onToggleLocked: (e: React.MouseEvent) => void
  onToggleLabelsHidden: (e: React.MouseEvent) => void
  onRemove: (e: React.MouseEvent) => void
  onSelectKeycap: (keyId: string, shiftKey: boolean) => void
  onEnterKeycapEdit: (keyId: string) => void
}

function KeycapLayerTreeNode({
  layer,
  zIndex,
  total,
  isActive,
  isExpanded,
  selectedKeycapIds,
  layerOverrides,
  keycapIdsWithImages,
  allKeys,
  onActivate,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onToggleLocked,
  onToggleLabelsHidden,
  onRemove,
  onSelectKeycap,
  onEnterKeycapEdit,
}: KeycapLayerTreeNodeProps) {
  return (
    <div className="flex flex-col gap-px">
      <KeycapLayerRow
        layer={layer}
        zIndex={zIndex}
        total={total}
        isActive={isActive}
        isExpanded={isExpanded}
        onActivate={onActivate}
        onToggleExpand={(e) => { e.stopPropagation(); onToggleExpand() }}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onToggleVisible={onToggleVisible}
        onToggleLocked={onToggleLocked}
        onToggleLabelsHidden={onToggleLabelsHidden}
        onRemove={onRemove}
      />

      {isExpanded && (
        // 单个 TooltipProvider 覆盖整个子键帽列表，替代每行独立 Provider
        <TooltipProvider delay={200}>
          <ul className="flex flex-col gap-px">
            {allKeys.map((keyDef) => {
              const override = layerOverrides[keyDef.keyId]
              const hasImages = keycapIdsWithImages.has(keyDef.keyId)
              return (
                <KeycapSubRow
                  key={keyDef.keyId}
                  keyDef={keyDef}
                  isSelected={isActive && selectedKeycapIds.includes(keyDef.keyId)}
                  hasOverride={Boolean(override)}
                  hasImages={hasImages}
                  onSelect={(shiftKey) => onSelectKeycap(keyDef.keyId, shiftKey)}
                  onEnterEdit={() => onEnterKeycapEdit(keyDef.keyId)}
                />
              )
            })}
          </ul>
        </TooltipProvider>
      )}
    </div>
  )
}

// ─── 键帽设计层区 ──────────────────────────────────────
// layers[0] = 最顶层，面板中正序展示
export function KeycapLayersSection() {
  const t = useTranslations("Design.layers")
  const { allKeys: ALL_KEYS } = useLayoutKeys()
  const layers = useDesignUIStore((s) => s.layers)
  const activeLayerId = useDesignUIStore((s) => s.activeLayerId)
  const selectedKeycapIds = useDesignUIStore((s) => s.selectedKeycapIds)
  const layerKeycapOverrides = useDesignUIStore((s) => s.layerKeycapOverrides)
  const canvasElements = useDesignUIStore((s) => s.canvasElements)
  const setActiveLayer = useDesignUIStore((s) => s.setActiveLayer)
  const setSelectedKeycapIds = useDesignUIStore((s) => s.setSelectedKeycapIds)
  const toggleKeycapSelection = useDesignUIStore((s) => s.toggleKeycapSelection)
  const setKeycapEditTarget = useDesignUIStore((s) => s.setKeycapEditTarget)
  const clearSelection = useDesignUIStore((s) => s.clearSelection)
  const toggleLayerVisible = useDesignUIStore((s) => s.toggleLayerVisible)
  const toggleLayerLocked = useDesignUIStore((s) => s.toggleLayerLocked)
  const toggleLayerLabelsHidden = useDesignUIStore((s) => s.toggleLayerLabelsHidden)
  const removeLayer = useDesignUIStore((s) => s.removeLayer)
  const reorderLayer = useDesignUIStore((s) => s.reorderLayer)

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    layers.forEach((l, i) => { init[l.id] = i === 0 })
    return init
  })

  if (selectedKeycapIds.length > 0 && activeLayerId && !expanded[activeLayerId]) {
    setExpanded((prev) => ({ ...prev, [activeLayerId]: true }))
  }

  const toggleExpanded = (layerId: string) => {
    setExpanded((prev) => ({ ...prev, [layerId]: !prev[layerId] }))
  }

  const keycapIdsWithImages = useMemo(() => {
    const ids = new Set<string>()
    for (const el of canvasElements) {
      if (el.type === "image" && el.clipToKeycapId) {
        ids.add(el.clipToKeycapId)
      }
      if (el.type === "image" && el.clipToKeycapIds) {
        for (const kid of el.clipToKeycapIds) {
          ids.add(kid)
        }
      }
    }
    return ids
  }, [canvasElements])

  const total = layers.length

  return (
    <div className="flex flex-col gap-px">
      <SectionHeader
        label={t("keycapGroup")}
        tooltip={t("keycapGroupHint")}
      />
      {layers.length === 0 && (
        <p className="py-2 text-center text-[11px] text-muted-foreground">
          {t("noKeycapLayers")}
        </p>
      )}
      <div className="flex flex-col gap-px">
        {layers.map((layer, i) => (
          <KeycapLayerTreeNode
            key={layer.id}
            layer={layer}
            zIndex={i + 1}
            total={total}
            isActive={layer.id === activeLayerId}
            isExpanded={Boolean(expanded[layer.id])}
            selectedKeycapIds={selectedKeycapIds}
            layerOverrides={layerKeycapOverrides[layer.id] ?? EMPTY_LAYER_OVERRIDES}
            keycapIdsWithImages={keycapIdsWithImages}
            allKeys={ALL_KEYS}
            onActivate={() => { setActiveLayer(layer.id); clearSelection() }}
            onToggleExpand={() => toggleExpanded(layer.id)}
            onMoveUp={(e) => { e.stopPropagation(); reorderLayer(layer.id, "up") }}
            onMoveDown={(e) => { e.stopPropagation(); reorderLayer(layer.id, "down") }}
            onToggleVisible={(e) => { e.stopPropagation(); toggleLayerVisible(layer.id) }}
            onToggleLocked={(e) => { e.stopPropagation(); toggleLayerLocked(layer.id) }}
            onToggleLabelsHidden={(e) => { e.stopPropagation(); toggleLayerLabelsHidden(layer.id) }}
            onRemove={(e) => { e.stopPropagation(); removeLayer(layer.id) }}
            onSelectKeycap={(keyId, shiftKey) => {
              setActiveLayer(layer.id)
              if (shiftKey) {
                toggleKeycapSelection(keyId)
              } else {
                setSelectedKeycapIds([keyId])
              }
            }}
            onEnterKeycapEdit={(keyId) => {
              setActiveLayer(layer.id)
              setSelectedKeycapIds([keyId])
              setKeycapEditTarget({ layerId: layer.id, keyId })
            }}
          />
        ))}
      </div>
    </div>
  )
}
