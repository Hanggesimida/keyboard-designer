/**
 * 外壳 GLB 资产契约。
 *
 * - 单位：米；Y-up，X 为宽、Z 为深
 * - 原点：键区中心；资产内 CaseRoot 已包含垂直偏移
 * - localBoundsMeters：包含脚垫与 USB 结构的完整场景 AABB
 */

export type CaseModelVec3 = readonly [number, number, number]

export interface CaseModelAsset {
  path: string
  /** GLB 内声明的真实布局；144 复用 108，因此两者不同 */
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
  layoutId: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): CaseModelAsset {
  return {
    path: `${CASE_DIR}/${layoutId}.glb`,
    layoutId,
    localBoundsMeters: {
      min: [minX, MIN_Y_METERS, minZ],
      max: [maxX, MAX_Y_METERS, maxZ],
    },
  }
}

const ANSI_61_CASE = defineCaseAsset(
  "ansi-61",
  -0.149375,
  0.149375,
  -0.05538,
  0.054125,
)
const ANSI_68_CASE = defineCaseAsset(
  "ansi-68",
  -0.1589,
  0.1589,
  -0.05538,
  0.054125,
)
const ANSI_81_CASE = defineCaseAsset(
  "ansi-81",
  -0.1589,
  0.1589,
  -0.064905,
  0.06365,
)
const ANSI_87_CASE = defineCaseAsset(
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
const ANSI_108_CASE = defineCaseAsset(
  "ansi-108",
  -0.220812,
  0.220812,
  -0.067286,
  0.066031,
)

export const CASE_MODEL_REGISTRY: Readonly<Record<string, CaseModelAsset>> = {
  "ansi-61": ANSI_61_CASE,
  "ansi-68": ANSI_68_CASE,
  "ansi-81": ANSI_81_CASE,
  "ansi-87": ANSI_87_CASE,
  "ansi-104": ANSI_104_CASE,
  "ansi-108": ANSI_108_CASE,
  // 144 的 base 区与 108 完全一致；supplement 区不需要外壳。
  "ansi-144": ANSI_108_CASE,
}

export const CASE_MODEL_PATHS: readonly string[] = Array.from(
  new Set(Object.values(CASE_MODEL_REGISTRY).map((asset) => asset.path)),
)

export const CASE_BODY_MATERIAL_NAME = "CaseBody_Anodized_Navy"
export const CASE_EDGE_MATERIAL_NAME = "CaseEdge_Anodized"

export function resolveCaseModelAsset(
  templateId: string,
): CaseModelAsset | null {
  return CASE_MODEL_REGISTRY[templateId] ?? null
}
