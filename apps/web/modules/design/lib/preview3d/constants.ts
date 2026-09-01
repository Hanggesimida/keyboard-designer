/**
 * 3D 预览常量与坐标契约。
 *
 * - 设计坐标：X 向右、Y 向下
 * - Three 坐标：X 向右、Y 向上、Z 朝使用者
 * - 键帽原点：底面中心
 * - `1u = 1 world unit`
 */

/** 占位键帽高度（世界单位，1u = 1.0） */
export const PLACEHOLDER_KEY_HEIGHT = 0.2

/** 占位键帽兜底颜色 */
export const PLACEHOLDER_COLOR = "#8a8f98"

/** 壳体四周相对键位包围盒的外延（世界单位 u） */
export const CASE_BEZEL_U = 0.4

/** 外框高度（不含叠在顶上的定位板） */
export const CASE_HEIGHT_U = 0.7

/** 定位板顶面到键帽底面（y = 0）的间隙 */
export const CASE_TOP_GAP_U = 0.04

/** 定位板相对外框的水平内缩 */
export const PLATE_INSET_U = 0.12

/** 定位板厚度；叠在外框顶面上 */
export const PLATE_THICKNESS_U = 0.05

/** RoundedBox 圆角；渲染层按最短边钳制 */
export const CASE_CORNER_RADIUS_U = 0.18

export const CASE_BODY_COLOR = "#2a2d32"

export const CASE_PLATE_COLOR = "#3d424a"

export const CASE_MATERIAL_ROUGHNESS = 0.85

export const CASE_MATERIAL_METALNESS = 0.08

/** 真实按键时键帽沿 -Y 下沉（世界单位 u） */
export const KEYCAP_PRESS_TRAVEL_U = 0.08

/** 相机相对键盘包围盒的距离系数（FOV/宽高比拟合后的额外边距） */
export const CAMERA_FIT_PADDING = 1.2

/** 相机初始俯仰：相对水平距离的高度比 */
export const CAMERA_HEIGHT_RATIO = 0.55

/** Canvas 垂直 FOV（度），需与 `<Canvas camera={{ fov }}>` 一致 */
export const CAMERA_FOV_DEG = 40

/** 3D 预览面板默认高度（px） */
export const PREVIEW_3D_HEIGHT_DEFAULT = 300

/** 3D 预览面板最小高度（px） */
export const PREVIEW_3D_HEIGHT_MIN = 160

/** 3D 预览面板最大高度（px） */
export const PREVIEW_3D_HEIGHT_MAX = 560

/** 预览高度 localStorage key（纯 UI，不进设计 JSON） */
export const PREVIEW_3D_HEIGHT_STORAGE_KEY = "keyboard-design-preview3d-height"

/**
 * 3D 预览背景，需与 `globals.css` 中 `--design-preview3d-bg` 保持一致。
 * Three.Color 不能直接解析 oklch()，场景背景用这些 sRGB hex。
 */
export const PREVIEW_3D_BG_LIGHT = "#ebebeb"
export const PREVIEW_3D_BG_DARK = "#3c3c3c"
