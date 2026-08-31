import { resolveFontFamily } from "@/lib/fontAssets"
import { isUserFontRef, toCssFontFamily } from "@/lib/fonts/fontRef"
import {
  LAYOUT_REGISTRY,
  type LayoutData,
} from "@/modules/design/data/layouts"
import type {
  DesignPayload,
  ExportCanvasElement,
  KeycapOverride,
  TextDescriptor,
} from "../contracts"
import { canOutlineFont, textDescriptorsToPathResults } from "./font-to-path"
import {
  isJigRotated,
  mapImage,
  pointsBBox,
  resolveBaseShape,
  resolveBottomFace,
  resolveMappingRect,
  resolveTopFace,
  shapeMarkup,
  type JigPosition,
  type JigShape,
  type LayoutKey,
} from "./geometry"

const KEYCAP_GAP = 2
const KEY_PAD_LEFT = 11
const KEY_PAD_RIGHT = 11
const ART_PAD = 28
const LABEL_OPTICAL_CENTER_RATIO = 0.09

interface ParsedDesign {
  color: string
  fontSize: number
  labelColor: string
  fontFamily: string
  overrides: Record<string, KeycapOverride>
  canvasElements: ExportCanvasElement[]
}

interface RenderContext {
  assignment: Map<JigPosition, string>
  positionsByKey: Map<string, JigPosition>
  keys: Record<string, LayoutKey>
  baseUnit: number
  topScale: number
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function colorOf(
  value: { color?: string; topColor?: string; bgColor?: string } | undefined,
  fallback: string,
) {
  return value?.color ?? value?.topColor ?? value?.bgColor ?? fallback
}

function parseDesign(design: DesignPayload): ParsedDesign {
  const global = design.globalKeycapStyle ?? {}
  const overrides: Record<string, KeycapOverride> = {}
  Object.values(design.layerKeycapOverrides ?? {}).forEach((layer) => {
    Object.entries(layer).forEach(([keyId, override]) => {
      overrides[keyId] = { ...overrides[keyId], ...override }
    })
  })
  return {
    color: colorOf(global, "#aaaaaa"),
    fontSize: global.fontSize ?? 7,
    labelColor: global.labelColor ?? "#cccccc",
    fontFamily: design.fontFamily ?? "Inter, system-ui, sans-serif",
    overrides,
    canvasElements: design.canvasElements ?? [],
  }
}

function layoutKeys(layout: LayoutData | undefined): Record<string, LayoutKey> {
  const keys: Record<string, LayoutKey> = {}
  layout?.rows.forEach((row) => {
    row.keys.forEach((key) => {
      keys[key.keyId] = {
        x: key.x,
        y: key.y,
        w: key.w,
        h: key.h,
        label: key.label ?? "",
        rowLevel: key.rowLevel,
        shape: key.shape,
      }
    })
  })
  return keys
}

function jigLookup(keyId: string) {
  const iso = keyId.match(/^(.+)_ISO$/)
  if (iso?.[1]) return { baseId: iso[1], geometryGroup: `${keyId}_1` }
  if (keyId.endsWith("_STEP")) {
    return { baseId: keyId.slice(0, -5), shape: "stepped" }
  }
  if (keyId.startsWith("KC_CUST_")) {
    return {
      baseId: "",
      rowLevel: keyId.match(/_R(\d)/)?.[1]
        ? `R${keyId.match(/_R(\d)/)![1]}`
        : undefined,
      anonymous: true,
    }
  }
  const fraction = keyId.match(/_(\d{3})$/)
  if (fraction?.[0] && fraction[1]) {
    return {
      baseId: keyId.slice(0, -fraction[0].length),
      unit: Number(fraction[1]) / 100,
    }
  }
  const integer = keyId.match(/_(\d+)U$/)
  if (integer?.[0] && integer[1]) {
    return {
      baseId: keyId.slice(0, -integer[0].length),
      unit: Number(integer[1]),
    }
  }
  const row = keyId.match(/_R(\d)$/)
  if (row?.[0] && row[1]) {
    return {
      baseId: keyId.slice(0, -row[0].length),
      rowLevel: `R${row[1]}`,
      unit: 1,
    }
  }
  return { baseId: keyId }
}

function buildAssignment(
  keys: Record<string, LayoutKey>,
  positions: JigPosition[],
) {
  const assignment = new Map<JigPosition, string>()
  const anonymousCursors = new Map<string, number>()
  for (const [keyId, key] of Object.entries(keys)) {
    const lookup = jigLookup(keyId)
    if (lookup.geometryGroup) {
      positions
        .filter((position) => position.geometry_group === lookup.geometryGroup)
        .forEach((position) => assignment.set(position, keyId))
      continue
    }
    if (lookup.anonymous) {
      const row = lookup.rowLevel ?? ""
      const available = positions.filter(
        (position) =>
          position.key_id === "" && (position.row_level ?? "") === row,
      )
      const cursor = anonymousCursors.get(row) ?? 0
      if (available[cursor]) assignment.set(available[cursor], keyId)
      anonymousCursors.set(row, cursor + 1)
      continue
    }

    const tall = lookup.unit == null && key.h > 1
    const targetUnit = lookup.unit ?? (tall ? key.h : key.w)
    const rowLevel = lookup.rowLevel ?? (tall ? undefined : key.rowLevel)
    const candidates = positions.filter(
      (position) =>
        position.key_id === lookup.baseId &&
        !position.geometry_group &&
        !assignment.has(position) &&
        (!lookup.shape || position.shape === lookup.shape) &&
        (!rowLevel ||
          !position.row_level ||
          position.row_level === rowLevel) &&
        (lookup.unit == null ||
          Math.abs((position.unit ?? 1) - targetUnit) <= 0.01),
    )
    candidates.sort(
      (a, b) =>
        Math.abs((a.unit ?? 1) - targetUnit) -
        Math.abs((b.unit ?? 1) - targetUnit),
    )
    if (candidates[0]) assignment.set(candidates[0], keyId)
  }
  return assignment
}

function createContext(
  design: DesignPayload,
  positions: JigPosition[],
): RenderContext {
  const layout = LAYOUT_REGISTRY[design.templateId]
  const keys = layoutKeys(layout)
  const assignment = buildAssignment(keys, positions)
  const positionsByKey = new Map<string, JigPosition>()
  assignment.forEach((keyId, position) => {
    if (!positionsByKey.has(keyId)) positionsByKey.set(keyId, position)
  })
  const baseUnit = layout?.baseUnit ?? 54
  const oneUnit = positions.find(
    (position) => position.unit === 1 && position.top_face_w != null,
  )
  const topScale =
    oneUnit?.top_face_w != null
      ? oneUnit.top_face_w /
        (baseUnit - KEYCAP_GAP - KEY_PAD_LEFT - KEY_PAD_RIGHT)
      : 1
  return { assignment, positionsByKey, keys, baseUnit, topScale }
}

function keyStyle(
  parsed: ParsedDesign,
  keyId: string,
  defaultLabel: string,
) {
  const override = parsed.overrides[keyId] ?? {}
  return {
    color: colorOf(override, parsed.color),
    label: override.labelText ?? defaultLabel,
    labelColor: override.labelColor ?? parsed.labelColor,
    fontSize: override.fontSize ?? parsed.fontSize,
    fontFamily: override.fontFamily ?? parsed.fontFamily,
    fontWeight: override.fontWeight,
    fontStyle: override.fontStyle,
    letterSpacing: override.letterSpacing ?? 0,
    lineHeightRatio: override.lineHeightRatio ?? 1.2,
    offsetX: override.labelOffsetX ?? 0,
    offsetY: override.labelOffsetY ?? 0,
  }
}

async function buildKeyLayers(
  context: RenderContext,
  design: ParsedDesign,
  labelsHidden: boolean,
) {
  const colorLines = ['<g id="jig-color-layer">']
  const descriptors: TextDescriptor[] = []
  const descriptorMeta = new Map<
    string,
    { fill: string; keyId: string; rotation?: string }
  >()
  const fallback: string[] = []
  const renderedLabels = new Set<string>()

  context.assignment.forEach((keyId, position) => {
    const key = context.keys[keyId]
    if (!key) return
    const style = keyStyle(design, keyId, key.label)
    const bottom = resolveBottomFace(position, context.topScale)
    const top = resolveTopFace(position, context.topScale)
    if (bottom) {
      colorLines.push(
        shapeMarkup(
          bottom,
          `fill="${escapeXml(style.color)}" data-key="${keyId}" data-layer="bottom"`,
        ),
      )
    }
    if (top) {
      colorLines.push(
        shapeMarkup(
          top,
          `fill="${escapeXml(style.color)}" data-key="${keyId}" data-layer="top"`,
        ),
      )
    }
    if (
      labelsHidden ||
      !top ||
      !style.label ||
      renderedLabels.has(keyId)
    ) {
      return
    }
    renderedLabels.add(keyId)
    const box = top.kind === "rect" ? top : pointsBBox(top.points)
    const fontSize = style.fontSize * context.topScale
    const x =
      (position.label_cx ?? box.x + box.w / 2) +
      style.offsetX * context.topScale
    const y =
      (position.label_cy ?? box.y + box.h / 2) +
      style.offsetY * context.topScale -
      fontSize * LABEL_OPTICAL_CENTER_RATIO
    const lines = style.label.split("\n")
    const rotation = isJigRotated(key, position)
      ? `rotate(-90,${(box.x + box.w / 2).toFixed(4)},${(box.y + box.h / 2).toFixed(4)})`
      : undefined

    if (canOutlineFont(style.fontFamily, style.fontWeight, style.fontStyle)) {
      const id = `${keyId}__${descriptors.length}`
      descriptors.push({
        id,
        x,
        y,
        fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontStyle: style.fontStyle,
        lines,
        lineHeightRatio: style.lineHeightRatio,
        letterSpacing: style.letterSpacing * context.topScale,
        fill: style.labelColor,
      })
      descriptorMeta.set(id, {
        fill: style.labelColor,
        keyId,
        rotation,
      })
      return
    }

    const family = isUserFontRef(style.fontFamily)
      ? toCssFontFamily(style.fontFamily)
      : resolveFontFamily(style.fontFamily)
    const transform = rotation ? ` transform="${rotation}"` : ""
    if (lines.length === 1) {
      fallback.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${escapeXml(style.labelColor)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(family)}" data-key="${keyId}"${transform}>${escapeXml(style.label)}</text>`,
      )
    } else {
      const firstY =
        y - ((lines.length - 1) * fontSize * style.lineHeightRatio) / 2
      const spans = lines
        .map(
          (line, index) =>
            `<tspan x="${x}" dy="${index === 0 ? 0 : fontSize * style.lineHeightRatio}">${escapeXml(line || "\u00a0")}</tspan>`,
        )
        .join("")
      fallback.push(
        `<text x="${x}" y="${firstY}" font-size="${fontSize}" fill="${escapeXml(style.labelColor)}" text-anchor="middle" dominant-baseline="central" font-family="${escapeXml(family)}" data-key="${keyId}"${transform}>${spans}</text>`,
      )
    }
  })
  colorLines.push("</g>")

  const labelLines = ['<g id="jig-label-layer">']
  const results = await textDescriptorsToPathResults(descriptors)
  results.forEach((result) => {
    const meta = descriptorMeta.get(result.id)
    if (!result.pathD || !meta) return
    const path = `<path d="${result.pathD}" fill="${escapeXml(meta.fill)}" data-key="${meta.keyId}"/>`
    labelLines.push(
      meta.rotation ? `<g transform="${meta.rotation}">${path}</g>` : path,
    )
  })
  labelLines.push(...fallback, "</g>")
  return { color: colorLines.join("\n"), labels: labelLines.join("\n") }
}

function designKeyRect(key: LayoutKey, baseUnit: number, topFace: boolean) {
  const x = key.x * baseUnit + KEYCAP_GAP / 2
  const y = key.y * baseUnit + KEYCAP_GAP / 2
  const w = key.w * baseUnit - KEYCAP_GAP
  const h = key.h * baseUnit - KEYCAP_GAP
  if (!topFace) return { x, y, w, h }
  if (key.shape === "stepped") {
    return { x: x + 10, y: y + 6, w: w - 47, h: h - 16 }
  }
  if (key.shape === "iso") {
    return {
      x: x + 0.124 * w,
      y: y + 0.027 * h,
      w: 0.744 * w,
      h: 0.388 * h,
    }
  }
  return { x: x + 11, y: y + 6, w: w - 22, h: h - 16 }
}

function buildImageLayers(context: RenderContext, design: ParsedDesign) {
  const defs: string[] = []
  const perKey: string[] = ['<g id="jig-image-layer">']
  const global: string[] = ['<g id="jig-global-image-layer">']
  let clipIndex = 0

  const emit = (
    target: string[],
    image: ExportCanvasElement,
    keyId: string,
    key: LayoutKey,
    position: JigPosition,
    shape: JigShape,
    designRect: { x: number; y: number; w: number; h: number },
    jigRect: { x: number; y: number; w: number; h: number },
  ) => {
    const clipId = `jig-clip-${clipIndex++}`
    defs.push(`<clipPath id="${clipId}">${shapeMarkup(shape)}</clipPath>`)
    const mapped = mapImage({
      image: {
        x: image.x - ART_PAD,
        y: image.y - ART_PAD,
        width: image.width,
        height: image.height,
        rotation: image.rotation,
      },
      design: designRect,
      jig: jigRect,
      rotated: isJigRotated(key, position),
      topScale: context.topScale,
    })
    const centerX = mapped.x + mapped.w / 2
    const centerY = mapped.y + mapped.h / 2
    const transform = mapped.rotation
      ? ` transform="rotate(${mapped.rotation},${centerX},${centerY})"`
      : ""
    target.push(
      `<g clip-path="url(#${clipId})" opacity="${image.opacity ?? 1}" data-key="${keyId}"><image href="${escapeXml(image.src ?? "")}" x="${mapped.x}" y="${mapped.y}" width="${mapped.w}" height="${mapped.h}" preserveAspectRatio="none"${transform}/></g>`,
    )
  }

  design.canvasElements.forEach((image) => {
    if (image.type !== "image" || !image.src) return
    if (image.clipToKeycapId) {
      const keyId = image.clipToKeycapId
      const key = context.keys[keyId]
      const position = context.positionsByKey.get(keyId)
      if (!key || !position) return
      const shape = image.clipToTopFace
        ? resolveTopFace(position, context.topScale)
        : resolveBottomFace(position, context.topScale) ??
          resolveTopFace(position, context.topScale)
      const jigRect = resolveMappingRect(position)
      if (!shape || !jigRect) return
      emit(
        perKey,
        image,
        keyId,
        key,
        position,
        shape,
        designKeyRect(key, context.baseUnit, true),
        jigRect,
      )
      return
    }

    const explicit = image.clipToKeycapIds?.length
      ? new Set(image.clipToKeycapIds)
      : null
    Object.entries(context.keys).forEach(([keyId, key]) => {
      if (explicit && !explicit.has(keyId)) return
      const position = context.positionsByKey.get(keyId)
      if (!position) return
      const designRect = designKeyRect(key, context.baseUnit, false)
      if (
        !explicit &&
        (image.x - ART_PAD + image.width <= designRect.x ||
          image.x - ART_PAD >= designRect.x + designRect.w ||
          image.y - ART_PAD + image.height <= designRect.y ||
          image.y - ART_PAD >= designRect.y + designRect.h)
      ) {
        return
      }
      const shape = resolveBaseShape(position, context.topScale)
      const jigRect = resolveMappingRect(position, true)
      if (!shape || !jigRect) return
      emit(
        global,
        image,
        keyId,
        key,
        position,
        shape,
        designRect,
        jigRect,
      )
    })
  })
  perKey.push("</g>")
  global.push("</g>")
  return {
    defs: defs.join("\n"),
    perKey: perKey.join("\n"),
    global: global.join("\n"),
  }
}

function inject(svg: string, defs: string, layers: string[]) {
  if (defs) {
    const defsEnd = svg.indexOf("</defs>")
    svg =
      defsEnd >= 0
        ? `${svg.slice(0, defsEnd)}${defs}\n${svg.slice(defsEnd)}`
        : svg.replace(/<svg\b([^>]*)>/, `<svg$1><defs>${defs}</defs>`)
  }
  const defsEnd = svg.indexOf("</defs>")
  const insertion = `\n${layers.filter(Boolean).join("\n")}\n`
  return defsEnd >= 0
    ? `${svg.slice(0, defsEnd + 7)}${insertion}${svg.slice(defsEnd + 7)}`
    : svg.replace(/<svg\b([^>]*)>/, `<svg$1>${insertion}`)
}

async function loadJigTemplate(): Promise<string> {
  const url = new URL(
    "../../../modules/design/data/jig/keycap_jig.svg",
    import.meta.url,
  )
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`治具 SVG 读取失败：HTTP ${response.status}`)
  }
  return response.text()
}

async function loadJigPositions(): Promise<JigPosition[]> {
  const url = new URL(
    "../../../modules/design/data/jig/keycap_jig_positions.json",
    import.meta.url,
  )
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`治具位置数据读取失败：HTTP ${response.status}`)
  }
  return JSON.parse((await response.text()).replace(/^\uFEFF/, "")) as JigPosition[]
}

export async function generateJigSvg(design: DesignPayload): Promise<string> {
  const parsed = parseDesign(design)
  const labelsHidden = (design.layers ?? []).some(
    (layer) => layer.labelsHidden === true,
  )
  const [template, positions] = await Promise.all([
    loadJigTemplate(),
    loadJigPositions(),
  ])
  const context = createContext(design, positions)
  const keyLayers = await buildKeyLayers(context, parsed, labelsHidden)
  const images = buildImageLayers(context, parsed)
  return inject(template, images.defs, [
    keyLayers.color,
    images.global,
    images.perKey,
    keyLayers.labels,
  ])
}
