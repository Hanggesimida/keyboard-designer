// ─── 缩放句柄类型（CanvasImageElement / KeycapEditorImageElement 共用） ─────────
export type ResizeCorner = "se" | "sw" | "ne" | "nw"
export type ResizeEdge = "n" | "s" | "e" | "w"
export type ResizeHandle = ResizeCorner | ResizeEdge

/**
 * 根据拖拽方向和句柄位置计算新的矩形。
 * 提取自两个 ImageElement 组件中完全相同的缩放逻辑。
 *
 * @param minSize 最小允许宽/高（坐标系单位）
 * @returns 新的 { x, y, w, h }
 */
export function computeResizePatch(
  handle: ResizeHandle,
  dx: number,
  dy: number,
  startX: number,
  startY: number,
  startW: number,
  startH: number,
  lockAspect: boolean,
  minSize: number,
): { x: number; y: number; w: number; h: number } {
  let rdx = dx, rdy = dy
  const isCorner = handle === "se" || handle === "sw" || handle === "ne" || handle === "nw"
  if (isCorner && lockAspect) {
    const aspect = startW / startH
    const dw = handle === "sw" || handle === "nw" ? -rdx : rdx
    const dh = handle === "ne" || handle === "nw" ? -rdy : rdy
    let nDw: number, nDh: number
    if (Math.abs(dw) >= Math.abs(dh * aspect)) {
      nDw = dw; nDh = dw / aspect
    } else {
      nDh = dh; nDw = dh * aspect
    }
    rdx = handle === "sw" || handle === "nw" ? -nDw : nDw
    rdy = handle === "ne" || handle === "nw" ? -nDh : nDh
  }
  let nx = startX, ny = startY, nw = startW, nh = startH
  if (handle === "se")      { nw = Math.max(minSize, startW + rdx); nh = Math.max(minSize, startH + rdy) }
  else if (handle === "sw") { nw = Math.max(minSize, startW - rdx); nx = startX + startW - nw; nh = Math.max(minSize, startH + rdy) }
  else if (handle === "ne") { nw = Math.max(minSize, startW + rdx); nh = Math.max(minSize, startH - rdy); ny = startY + startH - nh }
  else if (handle === "nw") { nw = Math.max(minSize, startW - rdx); nx = startX + startW - nw; nh = Math.max(minSize, startH - rdy); ny = startY + startH - nh }
  else if (handle === "s")  { nh = Math.max(minSize, startH + rdy) }
  else if (handle === "n")  { nh = Math.max(minSize, startH - rdy); ny = startY + startH - nh }
  else if (handle === "e")  { nw = Math.max(minSize, startW + rdx) }
  else if (handle === "w")  { nw = Math.max(minSize, startW - rdx); nx = startX + startW - nw }
  return { x: nx, y: ny, w: nw, h: nh }
}

/** 将起始角度加上增量后归一化到 [0, 360) 的整数度 */
export function normalizeAngleDeg(startRot: number, deltaDeg: number): number {
  return Math.round(((startRot + deltaDeg) % 360 + 360) % 360)
}

/** 裁切到键帽的图片在语义上属于键帽表面，而非浮于键盘上方的独立图层 */
export function isKeycapSurfaceImage(el: {
  clipToKeycaps?: boolean
  clipToKeycapId?: string
}): boolean {
  return !!el.clipToKeycaps || !!(el.clipToKeycapId && el.clipToKeycaps !== false)
}

/**
 * 画布图片的指针命中策略：
 * - free：完整外接矩形可交互（自由浮层，或已选中的裁切图）
 * - passThrough：不拦截，点击落到下方键帽（未选中的裁切图）
 */
export type ImagePointerMode = "free" | "passThrough"

export function getImagePointerMode(
  el: { clipToKeycaps?: boolean; clipToKeycapId?: string },
  isSelected: boolean,
): ImagePointerMode {
  if (!isKeycapSurfaceImage(el)) return "free"
  return isSelected ? "free" : "passThrough"
}
