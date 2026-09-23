/**
 * 键帽图片投影预览材质：MeshStandardMaterial + onBeforeCompile。
 * 采样不依赖 mesh UV，按世界坐标平面投影。
 * 图片图集：顶面、斜面和侧壁直接按世界 XZ 采样；UV 出界丢弃。
 * 刻字图集：仅顶面混合，UV 出界丢弃（避免字色糊到侧壁）。
 */

import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  type Texture,
} from "three"
import {
  KEYCAP_MATERIAL_ENV_MAP_INTENSITY,
  KEYCAP_MATERIAL_METALNESS,
  KEYCAP_MATERIAL_ROUGHNESS,
} from "@/modules/design/lib/preview3d/constants"
import {
  materialSurfaceFinish,
  type MaterialSettings,
} from "@/modules/design/lib/design/materials"

/** 场景级共享的贴花 uniform（多颗键帽引用同一对象） */
export interface SharedDyeSubUniforms {
  uMap: { value: Texture | null }
  uImageMatrix: { value: Matrix3 }
  uHasMap: { value: number }
  uLegendMap: { value: Texture | null }
  uLegendMatrix: { value: Matrix3 }
  uHasLegend: { value: number }
}

export function createSharedDyeSubUniforms(): SharedDyeSubUniforms {
  return {
    uMap: { value: null },
    uImageMatrix: { value: new Matrix3() },
    uHasMap: { value: 0 },
    uLegendMap: { value: null },
    uLegendMatrix: { value: new Matrix3() },
    uHasLegend: { value: 0 },
  }
}

export interface KeycapDyeSubMaterialOptions {
  shared: SharedDyeSubUniforms
  color: string
  selected?: boolean
  /** 占位线框等 */
  transparent?: boolean
  opacity?: number
  wireframe?: boolean
  roughness?: number
  metalness?: number
  surface?: MaterialSettings
  woodMap?: Texture
}

interface KeycapSurfaceUniforms {
  woodEnabled: { value: number }
  woodMap: { value: Texture | null }
  woodScale: { value: number }
  grainStrength: { value: number }
}

const SURFACE_UNIFORMS = new WeakMap<
  MeshPhysicalMaterial,
  KeycapSurfaceUniforms
>()
const SHADER_CACHE_KEY = "keycap-dyesub-v6-physical-wood"

function materialEnvMapIntensity(presetId: MaterialSettings["presetId"]): number {
  if (presetId === "metal") return 1.2
  if (presetId === "glass") return 1.35
  if (presetId === "ceramic") return 1.05
  if (presetId === "translucentPlastic") return 1
  if (presetId === "wood") return 0.58
  return KEYCAP_MATERIAL_ENV_MAP_INTENSITY
}

function materialThickness(presetId: MaterialSettings["presetId"]): number {
  return presetId === "glass" ? 0.16 : 0.12
}

/**
 * 创建带世界空间贴花的 Physical 材质。
 * 调用方负责 dispose；shared uniforms 由场景层持有与更新。
 */
export function createKeycapDyeSubMaterial(
  options: KeycapDyeSubMaterialOptions,
): MeshPhysicalMaterial {
  const selected = options.selected ?? false
  const surface = options.surface
  const transparency = surface?.transparency ?? 0
  const finish = surface
    ? materialSurfaceFinish(surface.presetId)
    : materialSurfaceFinish("mattePlastic")
  const mat = new MeshPhysicalMaterial({
    color: options.color,
    roughness:
      options.roughness ??
      surface?.roughness ??
      KEYCAP_MATERIAL_ROUGHNESS,
    metalness:
      options.metalness ??
      surface?.metalness ??
      KEYCAP_MATERIAL_METALNESS,
    envMapIntensity: surface
      ? materialEnvMapIntensity(surface.presetId)
      : KEYCAP_MATERIAL_ENV_MAP_INTENSITY,
    emissive: selected ? "#5b8def" : "#000000",
    emissiveIntensity: selected ? 0.35 : 0,
    transparent: options.transparent ?? transparency > 0,
    opacity: options.opacity ?? 1,
    wireframe: options.wireframe ?? false,
    transmission: transparency,
    thickness: surface ? materialThickness(surface.presetId) : 0.12,
    ior: finish.ior,
    clearcoat: finish.clearcoat,
    clearcoatRoughness: finish.clearcoatRoughness,
    depthWrite: options.transparent ? false : transparency === 0,
  })
  const surfaceUniforms: KeycapSurfaceUniforms = {
    woodEnabled: { value: surface?.presetId === "wood" ? 1 : 0 },
    woodMap: { value: options.woodMap ?? null },
    woodScale: { value: 0.42 },
    grainStrength: {
      value: surface?.presetId === "mattePlastic" ? 0.08 : 0,
    },
  }
  SURFACE_UNIFORMS.set(mat, surfaceUniforms)

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMap = options.shared.uMap
    shader.uniforms.uImageMatrix = options.shared.uImageMatrix
    shader.uniforms.uHasMap = options.shared.uHasMap
    shader.uniforms.uLegendMap = options.shared.uLegendMap
    shader.uniforms.uLegendMatrix = options.shared.uLegendMatrix
    shader.uniforms.uHasLegend = options.shared.uHasLegend
    shader.uniforms.uWoodEnabled = surfaceUniforms.woodEnabled
    shader.uniforms.uWoodMap = surfaceUniforms.woodMap
    shader.uniforms.uWoodScale = surfaceUniforms.woodScale
    shader.uniforms.uSurfaceGrainStrength = surfaceUniforms.grainStrength

    shader.vertexShader = shader.vertexShader.replace(
      "void main() {",
      /* glsl */ `
varying vec3 vWorldPos_dye;
varying vec3 vWorldNormal_dye;
void main() {
`,
    )

    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      /* glsl */ `
#include <project_vertex>
vWorldPos_dye = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWorldNormal_dye = normalize(mat3(modelMatrix) * objectNormal);
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      /* glsl */ `
uniform sampler2D uMap;
uniform mat3 uImageMatrix;
uniform float uHasMap;
uniform sampler2D uLegendMap;
uniform mat3 uLegendMatrix;
uniform float uHasLegend;
uniform sampler2D uWoodMap;
uniform float uWoodEnabled;
uniform float uWoodScale;
varying vec3 vWorldPos_dye;
varying vec3 vWorldNormal_dye;
uniform float uSurfaceGrainStrength;
float pbtGrainHash(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
void main() {
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      /* glsl */ `
#include <roughnessmap_fragment>
{
  float pbtGrain = pbtGrainHash(floor(vWorldPos_dye * 64.0));
  roughnessFactor = clamp(
    roughnessFactor + (pbtGrain - 0.5) * uSurfaceGrainStrength,
    0.04,
    1.0
  );
}
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      /* glsl */ `
#include <map_fragment>
{
  vec3 N = normalize(vWorldNormal_dye);
  vec3 P = vWorldPos_dye;
  float topW = smoothstep(0.25, 0.75, N.y);
  if (uWoodEnabled > 0.5) {
    vec3 woodWeights = pow(abs(N), vec3(4.0));
    woodWeights /= max(
      woodWeights.x + woodWeights.y + woodWeights.z,
      0.0001
    );
    vec3 woodX = texture2D(uWoodMap, P.zy * uWoodScale).rgb;
    vec3 woodY = texture2D(uWoodMap, P.xz * uWoodScale).rgb;
    vec3 woodZ = texture2D(uWoodMap, P.xy * uWoodScale).rgb;
    diffuseColor.rgb *=
      woodX * woodWeights.x +
      woodY * woodWeights.y +
      woodZ * woodWeights.z;
  }
  if (uHasMap > 0.5 && N.y > -0.2) {
    vec2 uv = (uImageMatrix * vec3(P.xz, 1.0)).xy;
    if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
      vec4 image = texture2D(uMap, uv);
      diffuseColor.rgb = mix(diffuseColor.rgb, image.rgb, image.a);
    }
  }
  if (uHasLegend > 0.5) {
    vec2 luv = (uLegendMatrix * vec3(P.xz, 1.0)).xy;
    if (luv.x >= 0.0 && luv.x <= 1.0 && luv.y >= 0.0 && luv.y <= 1.0) {
      vec4 legend = texture2D(uLegendMap, luv);
      diffuseColor.rgb = mix(diffuseColor.rgb, legend.rgb, legend.a * topW);
    }
  }
}
`,
    )
  }

  mat.customProgramCacheKey = () => SHADER_CACHE_KEY
  mat.needsUpdate = true
  return mat
}

export function syncDyeSubAppearance(
  material: MeshPhysicalMaterial,
  opts: { color: string; selected: boolean },
): void {
  material.color.set(opts.color)
  if (opts.selected) {
    material.emissive.set("#5b8def")
    material.emissiveIntensity = 0.35
  } else {
    material.emissive.set("#000000")
    material.emissiveIntensity = 0
  }
}

export function syncKeycapMaterialSurface(
  material: MeshPhysicalMaterial,
  surface: MaterialSettings,
  woodMap: Texture | null,
): void {
  const uniforms = SURFACE_UNIFORMS.get(material)
  const hadTransmission = material.transmission > 0
  const hasTransmission = surface.transparency > 0

  material.roughness = surface.roughness
  material.metalness = surface.metalness
  material.envMapIntensity = materialEnvMapIntensity(surface.presetId)
  material.transmission = surface.transparency
  material.transparent = hasTransmission
  material.depthWrite = !hasTransmission
  const finish = materialSurfaceFinish(surface.presetId)
  material.thickness = materialThickness(surface.presetId)
  material.ior = finish.ior
  material.clearcoat = finish.clearcoat
  material.clearcoatRoughness = finish.clearcoatRoughness
  if (uniforms) {
    uniforms.woodEnabled.value = surface.presetId === "wood" ? 1 : 0
    uniforms.woodMap.value = woodMap
    uniforms.grainStrength.value =
      surface.presetId === "mattePlastic" ? 0.08 : 0
  }
  if (hadTransmission !== hasTransmission) material.needsUpdate = true
}

/** 配置图片图集的颜色空间和采样方向。 */
export function configureDyeSubTexture(tex: Texture): void {
  tex.wrapS = ClampToEdgeWrapping
  tex.wrapT = ClampToEdgeWrapping
  tex.colorSpace = SRGBColorSpace
  tex.flipY = true
  tex.needsUpdate = true
}

/** 刻字图集：保留 mipmap 远看不闪，各向异性减轻斜视发糊 */
export function configureLegendTexture(tex: Texture, maxAnisotropy = 8): void {
  configureDyeSubTexture(tex)
  tex.generateMipmaps = true
  tex.minFilter = LinearMipmapLinearFilter
  tex.magFilter = LinearFilter
  tex.anisotropy = Math.max(1, Math.min(maxAnisotropy, 16))
  tex.needsUpdate = true
}

/** 把 9 元列主序数组写入 Matrix3 */
export function writeMatrix3Elements(
  target: Matrix3,
  elements: readonly number[],
): void {
  const e = target.elements
  for (let i = 0; i < 9; i++) {
    e[i] = elements[i] ?? 0
  }
}
