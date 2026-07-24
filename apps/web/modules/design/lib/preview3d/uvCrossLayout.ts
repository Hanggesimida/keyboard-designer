/**
 * 键帽 GLB 十字 UV 契约（TEXCOORD_0，glTF / Three 运行时坐标）。
 *
 * Blender 展开约定：
 * ```
 *      [back]
 * [left][top][right]
 *      [front]
 * ```
 * - 中心 = 顶面；下 = 正面；左 = 左侧面；上 = 后方；右 = 右侧面
 * - 底面（无用）缩成一点；Blender 放在 (1,1)，导出后因 V 翻转落在运行时 (≈1, 0)
 *
 * 长键（如 6.25u）顶面岛会横向拉长；精确像素格待贴图阶段按模型实测标定。
 * 本模块仅记录契约，不烘焙 CanvasTexture。
 */

/** UV 归一化矩形 [u0, v0, u1, v1]（左下→右上，glTF V 向上） */
export type UvRect = readonly [u0: number, v0: number, u1: number, v1: number]

/** 底面坍缩钉点（glTF 运行时；对应 Blender UV (1,1)） */
export const BOTTOM_COLLAPSE_UV: readonly [number, number] = [1, 0]

/**
 * 十字五面语义占位矩形（1u 量级粗分；非像素级真值）。
 * 贴图实现前仅作文档/后续标定起点。
 */
export const UV_CROSS_FACE_RECTS = {
  /** 中心：顶面 */
  top: [0.3, 0.3, 0.7, 0.7] as UvRect,
  /** 下方：正面 */
  front: [0.3, 0.05, 0.7, 0.3] as UvRect,
  /** 左：左侧面 */
  left: [0.05, 0.3, 0.3, 0.7] as UvRect,
  /** 上：后方 */
  back: [0.3, 0.7, 0.7, 0.95] as UvRect,
  /** 右：右侧面 */
  right: [0.7, 0.3, 0.95, 0.7] as UvRect,
} as const

export type UvCrossFace = keyof typeof UV_CROSS_FACE_RECTS
