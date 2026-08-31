export interface Point {
  x: number
  y: number
}

export interface JigPosition {
  key_id: string
  unit?: number
  row_level?: string
  shape?: string
  geometry_group?: string
  top_face_x?: number
  top_face_y?: number
  top_face_w?: number
  top_face_h?: number
  top_face_rx?: number
  top_face_points?: Point[]
  bottom_box_x?: number
  bottom_box_y?: number
  bottom_box_w?: number
  bottom_box_h?: number
  base_points?: Point[]
  base_box_x?: number
  base_box_y?: number
  base_box_w?: number
  base_box_h?: number
  base_box_rx?: number
  label_cx?: number
  label_cy?: number
}

export interface LayoutKey {
  x: number
  y: number
  w: number
  h: number
  label: string
  rowLevel?: string
  shape?: string
}

export type JigShape =
  | { kind: "rect"; x: number; y: number; w: number; h: number; rx?: number }
  | { kind: "poly"; points: Point[]; radius: number | number[] }

export function pointsBBox(points: Point[]) {
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

export function roundedPolygonPath(
  points: Point[],
  radius: number | number[],
): string {
  if (points.length < 3) return ""
  const getRadius = (index: number) =>
    Array.isArray(radius)
      ? (radius[index] ?? radius.at(-1) ?? 0)
      : radius
  const corners = points.map((current, index) => {
    const previous = points[(index - 1 + points.length) % points.length]!
    const next = points[(index + 1) % points.length]!
    const a = { x: previous.x - current.x, y: previous.y - current.y }
    const b = { x: next.x - current.x, y: next.y - current.y }
    const aLength = Math.hypot(a.x, a.y)
    const bLength = Math.hypot(b.x, b.y)
    const r = Math.min(getRadius(index), aLength / 2, bLength / 2)
    const before = {
      x: current.x + (a.x / aLength) * r,
      y: current.y + (a.y / aLength) * r,
    }
    const after = {
      x: current.x + (b.x / bLength) * r,
      y: current.y + (b.y / bLength) * r,
    }
    const cross = (a.x / aLength) * (b.y / bLength) -
      (a.y / aLength) * (b.x / bLength)
    return { before, after, radius: r, sweep: cross > 0 ? 0 : 1 }
  })
  const f = (value: number) => value.toFixed(2)
  const commands = [
    `M ${f(corners[0]!.before.x)},${f(corners[0]!.before.y)}`,
  ]
  corners.forEach((corner, index) => {
    commands.push(
      `A ${f(corner.radius)},${f(corner.radius)} 0 0 ${corner.sweep} ${f(corner.after.x)},${f(corner.after.y)}`,
    )
    const following = corners[index + 1]
    if (following) {
      commands.push(`L ${f(following.before.x)},${f(following.before.y)}`)
    }
  })
  commands.push("Z")
  return commands.join(" ")
}

const isoRadii = (radius: number) => [
  radius,
  radius,
  radius,
  radius,
  radius * 1.5,
  radius,
]

export function resolveTopFace(
  position: JigPosition,
  topScale: number,
): JigShape | null {
  const {
    top_face_x: x,
    top_face_y: y,
    top_face_w: w,
    top_face_h: h,
  } = position
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: position.top_face_rx ?? 0 }
  }
  return position.top_face_points?.length
    ? {
        kind: "poly",
        points: position.top_face_points,
        radius: isoRadii(4 * topScale),
      }
    : null
}

export function resolveBottomFace(
  position: JigPosition,
  topScale: number,
): JigShape | null {
  const {
    bottom_box_x: x,
    bottom_box_y: y,
    bottom_box_w: w,
    bottom_box_h: h,
  } = position
  if (x != null && y != null && w != null && h != null) {
    return { kind: "rect", x, y, w, h, rx: 0 }
  }
  return position.base_points?.length
    ? {
        kind: "poly",
        points: position.base_points,
        radius: 1.5 * topScale,
      }
    : null
}

export function resolveMappingRect(position: JigPosition, base = false) {
  if (base) {
    const {
      base_box_x: x,
      base_box_y: y,
      base_box_w: w,
      base_box_h: h,
    } = position
    if (x != null && y != null && w != null && h != null) {
      return { kind: "rect" as const, x, y, w, h, rx: position.base_box_rx ?? 0 }
    }
    return position.base_points?.length
      ? { kind: "rect" as const, ...pointsBBox(position.base_points), rx: 0 }
      : null
  }
  const shape = resolveTopFace(position, 1)
  if (!shape) return null
  return shape.kind === "rect" ? shape : { kind: "rect" as const, ...pointsBBox(shape.points) }
}

export function resolveBaseShape(
  position: JigPosition,
  topScale: number,
): JigShape | null {
  if (position.base_points?.length && position.base_box_x == null) {
    return {
      kind: "poly",
      points: position.base_points,
      radius: 1.5 * topScale,
    }
  }
  const x = position.bottom_box_x ?? position.base_box_x
  const y = position.bottom_box_y ?? position.base_box_y
  const w = position.bottom_box_w ?? position.base_box_w
  const h = position.bottom_box_h ?? position.base_box_h
  return x != null && y != null && w != null && h != null
    ? { kind: "rect", x, y, w, h, rx: position.base_box_rx ?? 0 }
    : null
}

export function shapeMarkup(shape: JigShape, attributes = ""): string {
  if (shape.kind === "rect") {
    return `<rect x="${shape.x.toFixed(4)}" y="${shape.y.toFixed(4)}" width="${shape.w.toFixed(4)}" height="${shape.h.toFixed(4)}" rx="${(shape.rx ?? 0).toFixed(4)}" ${attributes}/>`
  }
  return `<path d="${roundedPolygonPath(shape.points, shape.radius)}" ${attributes}/>`
}

export function isJigRotated(key: LayoutKey, position: JigPosition): boolean {
  const width = position.top_face_w ?? position.bottom_box_w
  const height = position.top_face_h ?? position.bottom_box_h
  return key.h > key.w && width != null && height != null && width > height
}

export function mapImage(input: {
  image: { x: number; y: number; width: number; height: number; rotation?: number }
  design: { x: number; y: number; w: number; h: number }
  jig: { x: number; y: number; w: number; h: number }
  rotated: boolean
  topScale: number
}) {
  const { image, design, jig, rotated, topScale } = input
  if (rotated) {
    const sxH = design.h ? jig.w / design.h : topScale
    const sxW = design.w ? jig.h / design.w : topScale
    const centerX = image.x - design.x + image.width / 2
    const centerY = image.y - design.y + image.height / 2
    const width = image.width * sxW
    const height = image.height * sxH
    return {
      x: jig.x + centerY * sxH - width / 2,
      y: jig.y + (design.w - centerX) * sxW - height / 2,
      w: width,
      h: height,
      rotation: (image.rotation ?? 0) - 90,
    }
  }
  const sx = design.w ? jig.w / design.w : topScale
  const sy = design.h ? jig.h / design.h : topScale
  return {
    x: jig.x + (image.x - design.x) * sx,
    y: jig.y + (image.y - design.y) * sy,
    w: image.width * sx,
    h: image.height * sy,
    rotation: image.rotation ?? 0,
  }
}
