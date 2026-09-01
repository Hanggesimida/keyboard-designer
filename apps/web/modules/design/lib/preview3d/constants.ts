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
