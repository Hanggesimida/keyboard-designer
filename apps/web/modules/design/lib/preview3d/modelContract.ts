/**
 * GLB 键帽模型资产契约与尺寸族查表。
 *
 * 资产事实（对 apps/web/public/models/*.glb 实测）：
 * - 单位：米；1U footprint ≈ 0.0181m（相对 19.05mm 键距自带 ~5% 缝隙）
 * - 原点：键帽底面中心（y_min ≈ 0，X/Z 对称）
 * - 每个文件 1 node + 1 mesh，无材质槽 → 整键单色
 * - 缩放：MODEL_SCALE 将米换算为 `1u = 1 world unit`
 */

import type { KeyShape } from "@/modules/design/types/design"

/** MX 标准键距（米） */
export const MX_PITCH_METERS = 0.01905

/** 米 → 世界单位（1u）的统一缩放 */
export const MODEL_SCALE = 1 / MX_PITCH_METERS

export interface KeycapModelLookup {
  /** 布局原始宽度（u），非 gap 后 sizeU */
  w: number
  /** 布局原始高度（u） */
  h: number
  rowLevel?: string
  shape: KeyShape
}

export interface KeycapModelRef {
  path: string
}

/** 将布局尺寸格式化为查表 key 片段，如 1、1.25、6.25 */
function formatSizeU(n: number): string {
  if (!Number.isFinite(n)) return "0"
  // 去掉浮点噪声，保留最多 2 位小数，再去掉尾部 0
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

function buildRegistryKey(
  w: number,
  h: number,
  rowLevel: string,
  shape: KeyShape,
): string {
  return `${formatSizeU(w)}x${formatSizeU(h)}|${rowLevel}|${shape}`
}

const MODEL_DIR = "/models"

/**
 * 尺寸族查表：`${w}x${h}|${rowLevel}|${shape}` → GLB 路径。
 * 与 7 个布局模板中全部 (w,h,rowLevel,shape) 组合一一对应。
 */
export const KEYCAP_MODEL_REGISTRY: Readonly<Record<string, string>> = {
  "1x1|R1|rect": `${MODEL_DIR}/R1_1u.glb`,
  "1x1|R2|rect": `${MODEL_DIR}/R2_1u.glb`,
  "1x1|R3|rect": `${MODEL_DIR}/R3_1u.glb`,
  "1x1|R4|rect": `${MODEL_DIR}/R4_1u.glb`,
  "1.25x1|R1|rect": `${MODEL_DIR}/R1_1.25u.glb`,
  "1.5x1|R1|rect": `${MODEL_DIR}/R1_1.5u.glb`,
  "1.5x1|R3|rect": `${MODEL_DIR}/R3_1.5u.glb`,
  "1.75x1|R1|rect": `${MODEL_DIR}/R1_1.75u.glb`,
  "1.75x1|R2|rect": `${MODEL_DIR}/R2_1.75u.glb`,
  "1.75x1|R2|stepped": `${MODEL_DIR}/R2_1.75u_Stepped.glb`,
  "2x1|R1|rect": `${MODEL_DIR}/R1_2u.glb`,
  "2x1|R4|rect": `${MODEL_DIR}/R4_2u.glb`,
  "2.25x1|R1|rect": `${MODEL_DIR}/R1_2.25u.glb`,
  "2.25x1|R2|rect": `${MODEL_DIR}/R2_2.25u.glb`,
  "2.75x1|R1|rect": `${MODEL_DIR}/R1_2.75u.glb`,
  "1x2|R1|rect": `${MODEL_DIR}/R1-R1_2u_Vertical.glb`,
  "1x2|R3|rect": `${MODEL_DIR}/R2-R3_2u_Vertical.glb`,
  "1.5x2|R1|iso": `${MODEL_DIR}/R2-R3_ISOEnter.glb`,
  "6.25x1|R1|rect": `${MODEL_DIR}/Convex_6.25u.glb`,
  "7x1|R1|rect": `${MODEL_DIR}/Convex_7u.glb`,
}

/** 去重后的全部模型路径，供 preload */
export const KEYCAP_MODEL_PATHS: readonly string[] = Array.from(
  new Set(Object.values(KEYCAP_MODEL_REGISTRY)),
)

/**
 * 按布局尺寸 / 行位 / shape 解析 GLB 路径。
 * 未命中返回 null，由上层走占位兜底。
 */
export function resolveKeycapModel(
  key: KeycapModelLookup,
): KeycapModelRef | null {
  const rowLevel = key.rowLevel?.trim()
  if (!rowLevel) return null

  const registryKey = buildRegistryKey(key.w, key.h, rowLevel, key.shape)
  const path = KEYCAP_MODEL_REGISTRY[registryKey]
  if (!path) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Preview3D] 无匹配 GLB 模型，将使用占位键帽: ${registryKey}`,
      )
    }
    return null
  }
  return { path }
}
