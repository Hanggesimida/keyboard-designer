/**
 * GLB 键帽模型资产契约与尺寸族查表。
 *
 * 资产事实（对 apps/web/public/models/*.glb 实测）：
 * - 单位：米；1U footprint ≈ 0.0181m（相对 19.05mm 键距自带 ~5% 缝隙）
 * - 原点：键帽底面中心（y_min = 0，X/Z 对称）；node.translation = [0,0,0]，无 rotation
 * - 坐标系：Y-up（X 宽、Y 高、Z 深），与 Three.js 一致
 * - 每个文件 1 node + 1 mesh；统一材质名 `Keycap`；带 TEXCOORD_0 十字 UV
 * - 缩放：MODEL_SCALE 将米换算为 `1u = 1 world unit`
 * - UV 细节见 uvCrossLayout.ts
 */

import type { KeyShape } from "@/modules/design/types/design"

/** MX 标准键距（米） */
export const MX_PITCH_METERS = 0.01905

/** 米 → 世界单位（1u）的统一缩放 */
export const MODEL_SCALE = 1 / MX_PITCH_METERS

/** GLB 内统一材质名 */
export const KEYCAP_MATERIAL_NAME = "Keycap"

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

/** 尺寸片段中的小数点改为下划线，供文件名：1.25 → 1_25 */
function sizeTokenForFilename(n: number): string {
  return formatSizeU(n).replace(/\./g, "_")
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
 * 仅登记磁盘上真实存在的资产；未登记组合走占位 + 缺失提示。
 */
export const KEYCAP_MODEL_REGISTRY: Readonly<Record<string, string>> = {
  "1x1|R1|rect": `${MODEL_DIR}/R1_1u.glb`,
  "1x1|R2|rect": `${MODEL_DIR}/R2_1u.glb`,
  "1x1|R3|rect": `${MODEL_DIR}/R3_1u.glb`,
  "1x1|R4|rect": `${MODEL_DIR}/R4_1u.glb`,
  "1.25x1|R1|rect": `${MODEL_DIR}/R1_1_25u.glb`,
  "1.5x1|R3|rect": `${MODEL_DIR}/R3_1_5u.glb`,
  "1.75x1|R2|rect": `${MODEL_DIR}/R2_1_75u.glb`,
  "1.75x1|R2|stepped": `${MODEL_DIR}/R2_1_75u_Stepped.glb`,
  "2x1|R1|rect": `${MODEL_DIR}/R1_2u.glb`,
  "2x1|R4|rect": `${MODEL_DIR}/R4_2u.glb`,
  "2.25x1|R1|rect": `${MODEL_DIR}/R1_2_25u.glb`,
  "2.25x1|R2|rect": `${MODEL_DIR}/R2_2_25u.glb`,
  "2.75x1|R1|rect": `${MODEL_DIR}/R1_2_75u.glb`,
  "1x2|R1|rect": `${MODEL_DIR}/R1_2u_Vertical.glb`,
  "1x2|R3|rect": `${MODEL_DIR}/R2-R3_2u_Vertical.glb`,
  "6.25x1|R1|rect": `${MODEL_DIR}/R1_6_25u.glb`,
}

/**
 * 已知但尚未导出的期望文件名（用于缺失提示，不参与加载）。
 * 键与 registry key 同格式。
 */
const EXPECTED_MISSING_BASENAME: Readonly<Record<string, string>> = {
  "1.5x1|R1|rect": "R1_1_5u.glb",
  "1.75x1|R1|rect": "R1_1_75u.glb",
  "1.5x2|R1|iso": "R2-R3_ISOEnter.glb",
  "7x1|R1|rect": "R1_7u.glb",
}

/** 去重后的全部模型路径，供 preload */
export const KEYCAP_MODEL_PATHS: readonly string[] = Array.from(
  new Set(Object.values(KEYCAP_MODEL_REGISTRY)),
)

function basenameFromPath(path: string): string {
  const i = path.lastIndexOf("/")
  return i >= 0 ? path.slice(i + 1) : path
}

/**
 * 约定导出文件名（含尚未入库的组合），供缺失横幅展示。
 * - 命中 registry → 实际 basename
 * - 已知缺档 → EXPECTED_MISSING_BASENAME
 * - 其余 → `{row}_{w}u.glb`（竖键 / stepped / iso 尽量贴近现有命名）
 */
export function expectedKeycapModelName(key: KeycapModelLookup): string | null {
  const rowLevel = key.rowLevel?.trim()
  if (!rowLevel) return null

  const registryKey = buildRegistryKey(key.w, key.h, rowLevel, key.shape)
  const registered = KEYCAP_MODEL_REGISTRY[registryKey]
  if (registered) return basenameFromPath(registered)

  const knownMissing = EXPECTED_MISSING_BASENAME[registryKey]
  if (knownMissing) return knownMissing

  const wTok = sizeTokenForFilename(key.w)
  const hTok = sizeTokenForFilename(key.h)

  if (key.shape === "iso") {
    return `R2-R3_ISOEnter.glb`
  }
  if (key.shape === "stepped") {
    return `${rowLevel}_${wTok}u_Stepped.glb`
  }
  // 竖键：h > w 且 w≈1
  if (key.h > key.w + 0.01) {
    if (rowLevel === "R1") return `R1_${hTok}u_Vertical.glb`
    if (rowLevel === "R3") return `R2-R3_${hTok}u_Vertical.glb`
    return `${rowLevel}_${hTok}u_Vertical.glb`
  }

  return `${rowLevel}_${wTok}u.glb`
}

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
        `[Preview3D] 无匹配 GLB 模型，将使用占位键帽: ${registryKey}（期望 ${expectedKeycapModelName(key) ?? "?"}）`,
      )
    }
    return null
  }
  return { path }
}
