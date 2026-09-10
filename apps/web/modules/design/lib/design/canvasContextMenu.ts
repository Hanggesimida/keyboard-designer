import type {
  CanvasImageElement,
  KeycapOverride,
} from "@/modules/design/store/designUiStore"
import type { Viewport } from "@/modules/design/hooks/useViewport"
import type { KeyDef } from "@/modules/design/types/design"

export type CanvasContextTarget =
  | { type: "keycap"; keycapId: string; layerId: string; point: CanvasPoint }
  | { type: "image"; elementId: string; point: CanvasPoint }
  | { type: "blank"; point: CanvasPoint }

export type KeycapSelectionExpansion = "row" | "size" | "all"

export interface CanvasPoint {
  x: number
  y: number
}

export type KeycapStyleClipboard = Partial<KeycapOverride>
export type ImageElementClipboard = Omit<CanvasImageElement, "id">

export function clientPointToArtboard(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  viewport: Viewport,
): CanvasPoint {
  return {
    x: (clientX - containerRect.left - viewport.x) / viewport.zoom,
    y: (clientY - containerRect.top - viewport.y) / viewport.zoom,
  }
}

export function expandKeycapSelection(
  keys: readonly KeyDef[],
  selectedIds: readonly string[],
  anchorId: string,
  mode: KeycapSelectionExpansion,
): string[] {
  if (mode === "all") return keys.map((key) => key.keyId)

  const anchor = keys.find((key) => key.keyId === anchorId)
  if (!anchor) return [...selectedIds]

  const matches = keys.filter((key) => {
    if (mode === "row") {
      return key.section === anchor.section && key.y === anchor.y
    }
    return key.w === anchor.w && key.h === anchor.h
  })

  return [...new Set([...selectedIds, ...matches.map((key) => key.keyId)])]
}

export function createImageElementCopy(
  source: CanvasImageElement | ImageElementClipboard,
  artW: number,
  artH: number,
  center?: CanvasPoint,
): CanvasImageElement {
  const x = center ? center.x - source.width / 2 : source.x + 12
  const y = center ? center.y - source.height / 2 : source.y + 12
  const maxX = Math.max(0, artW - source.width)
  const maxY = Math.max(0, artH - source.height)

  return {
    ...source,
    id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x: Math.round(Math.min(maxX, Math.max(0, x))),
    y: Math.round(Math.min(maxY, Math.max(0, y))),
  }
}

export function centerImageOnArtboard(
  element: CanvasImageElement,
  artW: number,
  artH: number,
  axis: "horizontal" | "vertical",
): Pick<CanvasImageElement, "x" | "y"> {
  return {
    x:
      axis === "horizontal"
        ? Math.round((artW - element.width) / 2)
        : element.x,
    y:
      axis === "vertical"
        ? Math.round((artH - element.height) / 2)
        : element.y,
  }
}
