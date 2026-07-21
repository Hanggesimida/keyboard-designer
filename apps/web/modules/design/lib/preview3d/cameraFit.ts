import {
  CAMERA_FIT_PADDING,
  CAMERA_FOV_DEG,
  CAMERA_HEIGHT_RATIO,
} from "./constants"
import type { Vec3 } from "./layoutToWorld"

export interface CameraFitPose {
  position: Vec3
  target: Vec3
}

/**
 * 按键盘 XZ 包围盒、Canvas 宽高比与垂直 FOV 计算初始/复位相机位姿。
 * 站在空格侧（+Z）朝 Esc（-Z）看，保证七种模板在窄面板下也不裁边。
 */
export function computeCameraFitPose(
  center: Vec3,
  extents: { width: number; depth: number },
  aspect: number,
  fovDeg: number = CAMERA_FOV_DEG,
): CameraFitPose {
  const safeAspect = Math.max(aspect, 0.05)
  const vFov = (fovDeg * Math.PI) / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect)

  const halfW = (extents.width / 2) * CAMERA_FIT_PADDING
  const halfD = (extents.depth / 2) * CAMERA_FIT_PADDING

  const distForWidth = halfW / Math.tan(hFov / 2)
  const distForDepth = halfD / Math.tan(vFov / 2)
  const distance = Math.max(distForWidth, distForDepth, 2)
  const height = distance * CAMERA_HEIGHT_RATIO

  return {
    position: [center[0], height, center[2] + distance],
    target: [center[0], center[1], center[2]],
  }
}
