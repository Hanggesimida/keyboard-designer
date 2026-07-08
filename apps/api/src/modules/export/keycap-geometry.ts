/** 键帽间距（SVG 单位） */
export const KEYCAP_GAP = 2

/** 顶面内边距（SVG 单位）横向原来都是9 */
export const KEY_PAD_LEFT = 11
export const KEY_PAD_TOP = 6
export const KEY_PAD_RIGHT = 11
export const KEY_PAD_BOTTOM = 10

/** 圆角半径 */
export const KEY_RADIUS_BASE = 6
export const KEY_RADIUS_TOP = 4

/** 默认标签字号 */
export const KEY_LABEL_SIZE = 7

/**
 * 标签相对几何中心的向上微调系数：
 * font metrics 居中 ≠ 视觉居中（大写无 descender 时尤甚）
 */
export const KEY_LABEL_OPTICAL_CENTER_RATIO = 0.09

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export const STEPPED_PAD_LEFT = 10
export const STEPPED_PAD_TOP = 6
export const STEPPED_PAD_RIGHT = 37
export const STEPPED_PAD_BOTTOM = 10

// ─── 特殊键顶面相对几何 ────────────────────────────────────────────────────────
// 比例值从 keycap_jig_positions.json 推导：
// - stepped：以 base_box（对应画布键帽视觉尺寸）为参考框
// - iso：以两段 base_box 叠合后的整体为参考框


export interface TopFaceRect {
  x: number
  y: number
  w: number
  h: number
}

// ─── ISO Enter L 形多边形几何 ──────────────────────────────────────────────────
// 点位比例从 keycap_jig_positions.json index:144 推导：
//   base_points bbox: 78.8 × 106.22
//   top_face_points: 相对同一 bbox

export interface Point {
  x: number
  y: number
}

/**
 * ISO L 形底座 6 顶点比例（顺时针，相对外接矩形 pw×ph）
 *
 * 推导自 base_points：
 *   upper arm height: 52.23 / 106.22 ≈ 0.492
 *   lower arm x offset: 13.38 / 78.8  ≈ 0.170
 */
export const ISO_BASE_POINT_RATIOS: Point[] = [
  { x: 0,     y: 0     },
  { x: 1,     y: 0     },
  { x: 1,     y: 1     },
  { x: 0.170, y: 1     },
  { x: 0.170, y: 0.492 },
  { x: 0,     y: 0.492 },
]

/**
 * ISO L 形顶面 6 顶点比例（顺时针，相对外接矩形 pw×ph）
 *
 * 推导自 top_face_points：
 *   left pad:   9.73 / 78.8  ≈ 0.124
 *   top pad:    2.87 / 106.22 ≈ 0.027
 *   right edge: 68.41/ 78.8  ≈ 0.868
 *   bottom edge:95.35/ 106.22 ≈ 0.898
 *   notch x:   23.07/ 78.8  ≈ 0.293
 *   notch y:   41.80/ 106.22 ≈ 0.394
 */
export const ISO_TOP_FACE_POINT_RATIOS: Point[] = [
  { x: 0.124, y: 0.027 },
  { x: 0.868, y: 0.027 },
  { x: 0.868, y: 0.898 },
  { x: 0.293, y: 0.898 },
  { x: 0.293, y: 0.394 },
  { x: 0.124, y: 0.394 },
]

/** 将比例点列映射到 SVG 绝对坐标 */
export function getIsoBasePoints(px: number, py: number, pw: number, ph: number): Point[] {
  return ISO_BASE_POINT_RATIOS.map((r) => ({
    x: px + r.x * pw,
    y: py + r.y * ph,
  }))
}

/** 将比例点列映射到 SVG 绝对坐标 */
export function getIsoTopFacePoints(px: number, py: number, pw: number, ph: number): Point[] {
  return ISO_TOP_FACE_POINT_RATIOS.map((r) => ({
    x: px + r.x * pw,
    y: py + r.y * ph,
  }))
}

/**
 * 返回 ISO 顶面 6 个顶点的圆角半径数组。
 * index 4 为 L 形凹角，使用 r * 1.5 以获得更饱满的内角视觉效果，其余顶点使用 r。
 *
 * 顶点顺序（对应 ISO_TOP_FACE_POINT_RATIOS）：
 *   0: top-left  1: top-right  2: bottom-right
 *   3: bottom-left  4: L形凹角  5: left-middle
 */
export function getIsoTopFaceRadii(r: number): number[] {
  return [r, r, r, r, r * 1.5, r]
}

/**
 * 将多边形顶点列表转换为带圆角的 SVG path 字符串。
 *
 * 对每个顶点，用半径 r 的弧线替代尖角；若 r 超过相邻边半长则自动收缩。
 * 通过叉积判断凸/凹角：CW 转角（凸）→ sweep-flag=1，CCW 转角（凹）→ sweep-flag=0。
 *
 * @param r 统一半径，或按顶点索引指定的半径数组（数组长度不足时回退到最后一个值）
 */
export function roundedPolygonPath(points: Point[], r: number | number[]): string {
  const n = points.length
  if (n < 3) return ""

  const getR = (i: number): number =>
    Array.isArray(r) ? (r[i] ?? r[r.length - 1] ?? 0) : r

  const fmt = (v: number) => v.toFixed(2)

  type Corner = { t1: Point; t2: Point; sweep: 0 | 1; cr: number }
  const corners: Corner[] = points.map((curr, i) => {
    const prev = points[(i - 1 + n) % n]!
    const next = points[(i + 1) % n]!

    const d1x = prev.x - curr.x, d1y = prev.y - curr.y
    const d2x = next.x - curr.x, d2y = next.y - curr.y
    const len1 = Math.hypot(d1x, d1y)
    const len2 = Math.hypot(d2x, d2y)

    const u1x = d1x / len1, u1y = d1y / len1
    const u2x = d2x / len2, u2y = d2y / len2

    const cr = Math.min(getR(i), len1 / 2, len2 / 2)
    const t1: Point = { x: curr.x + u1x * cr, y: curr.y + u1y * cr }
    const t2: Point = { x: curr.x + u2x * cr, y: curr.y + u2y * cr }

    // 叉积 > 0 → CCW 转角（L 形凹角）→ sweep=0；< 0 → CW 转角（凸角）→ sweep=1
    const cross = u1x * u2y - u1y * u2x
    const sweep: 0 | 1 = cross > 0 ? 0 : 1

    return { t1, t2, sweep, cr }
  })

  const parts: string[] = []
  parts.push(`M ${fmt(corners[0]!.t1.x)},${fmt(corners[0]!.t1.y)}`)
  for (let i = 0; i < n; i++) {
    const { t2, sweep, cr } = corners[i]!
    parts.push(`A ${fmt(cr)},${fmt(cr)} 0 0 ${sweep} ${fmt(t2.x)},${fmt(t2.y)}`)
    if (i < n - 1) {
      parts.push(`L ${fmt(corners[i + 1]!.t1.x)},${fmt(corners[i + 1]!.t1.y)}`)
    }
  }
  parts.push("Z")
  return parts.join(" ")
}

/**
 * 根据键帽 shape 返回顶面矩形列表（绝对 SVG 坐标）。
 * - "stepped"：单个偏左窄顶面（阶梯帽）
 * - "iso"：由 KeycapNode 直接走多边形路径，不经此函数
 * - 其他：使用 KEY_PAD_* 常量的标准单矩形
 *
 * @param shape   keyDef.shape 字符串
 * @param px      键帽底座左上角 x（已含 GAP/2）
 * @param py      键帽底座左上角 y（已含 GAP/2）
 * @param pw      键帽底座宽（已减 GAP）
 * @param ph      键帽底座高（已减 GAP）
 */
export function getTopFaceRects(
  shape: string,
  px: number,
  py: number,
  pw: number,
  ph: number,
): TopFaceRect[] {
  if (shape === "stepped") {
    return [
      {
        x: px + STEPPED_PAD_LEFT,
        y: py + STEPPED_PAD_TOP,
        w: pw - STEPPED_PAD_LEFT - STEPPED_PAD_RIGHT,
        h: ph - STEPPED_PAD_TOP - STEPPED_PAD_BOTTOM,
      },
    ]
  }
  // ISO 键 label 定位基准取上臂区域，与 KeycapEditorModal 保持一致
  // 比例来自 ISO_TOP_FACE_POINT_RATIOS：左 0.124，上 0.027，右 0.868，折角 y 0.415
  if (shape === "iso") {
    return [
      {
        x: px + 0.124 * pw,
        y: py + 0.027 * ph,
        w: (0.868 - 0.124) * pw,
        h: (0.415 - 0.027) * ph,
      },
    ]
  }
  return [
    {
      x: px + KEY_PAD_LEFT,
      y: py + KEY_PAD_TOP,
      w: pw - KEY_PAD_LEFT - KEY_PAD_RIGHT,
      h: ph - KEY_PAD_TOP - KEY_PAD_BOTTOM,
    },
  ]
}
