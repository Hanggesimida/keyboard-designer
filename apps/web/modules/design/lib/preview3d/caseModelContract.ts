/**
 * 外壳 GLB 资产契约。
 *
 * - 单位：米；Y-up，X 为宽、Z 为深
 * - 原点：键区中心；资产内 CaseRoot 已包含垂直偏移
 * - localBoundsMeters：包含脚垫与 USB 结构的完整场景 AABB
 *
 * GLB 文件名沿用历史资产 ID（如 ansi-61.glb），与当前模板规范 ID 通过
 * CASE_MODEL_REGISTRY 映射，避免改名导致现有外壳资产失效。
 */

import { resolveLayoutId } from "@/modules/design/data/layouts"

export type CaseModelVec3 = readonly [number, number, number]

export interface CaseModelAsset {
  path: string
  /** GLB 文件及资产内声明的布局 ID；可与当前模板 ID 不同 */
  layoutId: string
  localBoundsMeters: {
    min: CaseModelVec3
    max: CaseModelVec3
  }
}

const CASE_DIR = "/models/cases"
const MIN_Y_METERS = -0.02415
const MAX_Y_METERS = 0.00213

function defineCaseAsset(
  assetLayoutId: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): CaseModelAsset {
  return {
    path: `${CASE_DIR}/${assetLayoutId}.glb`,
    layoutId: assetLayoutId,
    localBoundsMeters: {
      min: [minX, MIN_Y_METERS, minZ],
      max: [maxX, MAX_Y_METERS, maxZ],
    },
  }
}

const ANSI_60_CASE = defineCaseAsset(
  "ansi-61",
  -0.149375,
  0.149375,
  -0.05538,
  0.054125,
)
const ANSI_65_CASE = defineCaseAsset(
  "ansi-68",
  -0.1589,
  0.1589,
  -0.05538,
  0.054125,
)
const ANSI_75_CASE = defineCaseAsset(
  "ansi-80",
  -0.1589,
  0.1589,
  -0.067286,
  0.066031,
)
const ANSI_75_84_CASE = defineCaseAsset(
  "ansi-81",
  -0.1589,
  0.1589,
  -0.064905,
  0.06365,
)
const ANSI_TKL_CASE = defineCaseAsset(
  "ansi-87",
  -0.180331,
  0.180331,
  -0.067286,
  0.066031,
)
const ANSI_104_CASE = defineCaseAsset(
  "ansi-104",
  -0.220812,
  0.220812,
  -0.067286,
  0.066031,
)
const ANSI_1800_CASE = defineCaseAsset(
  "ansi-99",
  -0.189856,
  0.189856,
  -0.068495,
  0.067221,
)
const ANSI_108_CASE = defineCaseAsset(
  "ansi-108",
  -0.220812,
  0.220812,
  -0.067286,
  0.066031,
)

/** 以规范模板 ID 为键。 */
export const CASE_MODEL_REGISTRY: Readonly<Record<string, CaseModelAsset>> = {
  "ansi-60": ANSI_60_CASE,
  "ansi-65": ANSI_65_CASE,
  "ansi-75": ANSI_75_CASE,
  "ansi-75-84": ANSI_75_84_CASE,
  "ansi-tkl": ANSI_TKL_CASE,
  "ansi-104": ANSI_104_CASE,
  "ansi-1800": ANSI_1800_CASE,
  "ansi-108": ANSI_108_CASE,
  // 108-kit 的 base 区与 108 完全一致；supplement 区不需要外壳。
  "ansi-108-kit": ANSI_108_CASE,
}

export const CASE_MODEL_PATHS: readonly string[] = Array.from(
  new Set(Object.values(CASE_MODEL_REGISTRY).map((asset) => asset.path)),
)

export const CASE_BODY_MATERIAL_NAME = "CaseBody_Anodized_Navy"
export const CASE_EDGE_MATERIAL_NAME = "CaseEdge_Anodized"

export function resolveCaseModelAsset(
  templateId: string,
): CaseModelAsset | null {
  return CASE_MODEL_REGISTRY[resolveLayoutId(templateId)] ?? null
}
