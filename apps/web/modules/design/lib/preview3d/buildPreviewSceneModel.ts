import type { LayoutData } from "@/modules/design/data/layouts"
import { flattenLayout } from "@/modules/design/lib/design/layout"
import {
  buildGlobalDistributedColors,
  resolveKeycapAppearance,
} from "@/modules/design/lib/design/resolveKeycapAppearance"
import { keyCentersFromDefs } from "@/modules/design/lib/design/distributeGradientColors"
import { normalizeKeyShape } from "@/modules/design/types/design"
import { buildImageDecals } from "./imageDecal"
import { getKeyboardBounds, keyDefToWorld } from "./layoutToWorld"
import {
  expectedKeycapModelName,
  resolveKeycapModel,
} from "./modelContract"
import type {
  PreviewDesignStateInput,
  PreviewKey,
  PreviewSceneModel,
} from "./types"

/**
 * 纯函数：layout + 设计状态快照 → PreviewSceneModel。
 * 不依赖 React / Zustand / Three；可供单测与场景组件共用。
 */
export function buildPreviewSceneModel(
  layout: LayoutData,
  designState: PreviewDesignStateInput,
): PreviewSceneModel {
  const flatKeys = flattenLayout(layout)
  const baseUnit =
    Number.isFinite(layout.baseUnit) && layout.baseUnit > 0
      ? layout.baseUnit
      : 54

  const selected = new Set(designState.selectedKeycapIds)
  const g = designState.globalKeycapStyle
  const globalDistributedColors = buildGlobalDistributedColors(
    g.color,
    keyCentersFromDefs(flatKeys),
  )

  const missingSet = new Set<string>()

  const imageDecals = buildImageDecals({
    canvasElements: designState.canvasElements ?? [],
    assetMap: designState.assetMap ?? {},
    baseUnit,
    keys: flatKeys.map((k) => ({
      keyId: k.keyId,
      x: k.x,
      y: k.y,
      w: k.w,
      h: k.h,
    })),
    liveDragOverrides: designState.liveDragOverrides,
  })
  const decalKeySet = new Set(imageDecals[0]?.keyIds ?? [])

  const keys: PreviewKey[] = flatKeys.map((key) => {
    const appearance = resolveKeycapAppearance({
      globalStyle: g,
      layers: designState.layers,
      layerOverrides: designState.layerKeycapOverrides,
      keyId: key.keyId,
      defaultLabel: key.label,
      globalDistributedColors,
    })
    const { position, size } = keyDefToWorld(key, baseUnit)
    const shape = normalizeKeyShape(key.shape)
    const lookup = {
      w: key.w,
      h: key.h,
      rowLevel: key.rowLevel,
      shape,
    }
    const model = resolveKeycapModel(lookup)
    if (!model) {
      const expected = expectedKeycapModelName(lookup)
      if (expected) missingSet.add(expected)
    }

    return {
      id: key.keyId,
      label: appearance.labelText,
      shape,
      section: key.section ?? "base",
      rowLevel: key.rowLevel,
      position,
      sizeU: [size[0], size[2]],
      modelPath: model?.path,
      color: appearance.color,
      labelColor: appearance.labelColor,
      labelsHidden: appearance.labelsHidden,
      selected: selected.has(key.keyId),
      visible: appearance.visible,
      decalEnabled: decalKeySet.has(key.keyId),
    }
  })

  const missingModels = Array.from(missingSet).sort()

  const worldBounds = getKeyboardBounds(flatKeys)
  const bounds = {
    min: worldBounds.min,
    max: worldBounds.max,
    center: worldBounds.center,
    width: worldBounds.width,
    depth: worldBounds.depth,
  }

  const geometryRevision = `${designState.templateId}:${flatKeys.length}:${keys
    .map((k) => `${k.id}:${k.sizeU[0]}x${k.sizeU[1]}:${k.shape}:${k.modelPath ?? "-"}`)
    .join("|")}`

  const layerRevision = designState.layers
    .map(
      (l) =>
        `${l.id}:${l.visible ? 1 : 0}:${l.opacity}:${l.labelsHidden ? 1 : 0}`,
    )
    .join(",")

  const overridesRevision = Object.entries(designState.layerKeycapOverrides)
    .map(([layerId, byKey]) => {
      const keysPart = Object.entries(byKey ?? {})
        .map(([keyId, o]) => {
          if (!o) return `${keyId}:`
          return `${keyId}:${o.color ?? ""}|${o.labelColor ?? ""}|${o.labelText ?? ""}|${o.borderColor ?? ""}|${o.borderHidden ?? ""}`
        })
        .sort()
        .join(";")
      return `${layerId}>{${keysPart}}`
    })
    .sort()
    .join(",")

  const appearanceRevision = [
    g.color,
    g.labelColor,
    g.borderColor,
    g.borderHidden ? 1 : 0,
    layerRevision,
    overridesRevision,
  ].join("||")

  const selectionRevision = designState.selectedKeycapIds.join(",")
  const missingRevision = missingModels.join(",")

  const decalRevision = imageDecals
    .map(
      (d) =>
        `${d.elementId}:${d.opacity}:${d.keyIds.join(",")}:${d.matrixElements.map((n) => n.toFixed(5)).join(",")}`,
    )
    .join("|")

  return {
    templateId: designState.templateId,
    baseUnit,
    keys,
    bounds,
    missingModels,
    imageDecals,
    revision: `${geometryRevision}#${appearanceRevision}#${selectionRevision}#${missingRevision}#${decalRevision}`,
  }
}
