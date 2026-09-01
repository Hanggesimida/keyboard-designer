/**
 * 键帽五面热升华预览材质：MeshStandardMaterial + onBeforeCompile。
 * 采样不依赖 mesh UV，按世界坐标平面投影。
 * 图片贴花：侧壁沿水平法线外翻；仅 `uDecalEnabled` 的键采样；UV 出界钳制。
 * 刻字图集：仅顶面混合，UV 出界丢弃（避免字色糊到侧壁）。
 */

import {
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Texture,
} from "three"

/** 场景级共享的贴花 uniform（多颗键帽引用同一对象） */
export interface SharedDyeSubUniforms {
  uMap: { value: Texture | null }
  uImageMatrix: { value: Matrix3 }
  uHasMap: { value: number }
  uMapOpacity: { value: number }
  uWrapScale: { value: number }
  uLegendMap: { value: Texture | null }
  uLegendMatrix: { value: Matrix3 }
  uHasLegend: { value: number }
}

export function createSharedDyeSubUniforms(): SharedDyeSubUniforms {
  return {
    uMap: { value: null },
    uImageMatrix: { value: new Matrix3() },
    uHasMap: { value: 0 },
    uMapOpacity: { value: 1 },
    // 略大于 1：侧壁多卷一点，减少“只盖顶面”的空边感
    uWrapScale: { value: 1.15 },
    uLegendMap: { value: null },
    uLegendMatrix: { value: new Matrix3() },
    uHasLegend: { value: 0 },
  }
}

export interface KeycapDyeSubMaterialOptions {
  shared: SharedDyeSubUniforms
  color: string
  /** 世界空间顶面高度（底面在 y=0） */
  keyTopY: number
  /** 是否对本键启用贴花（与 2D 相交键一致） */
  decalEnabled?: boolean
  selected?: boolean
  /** 占位线框等 */
  transparent?: boolean
  opacity?: number
  wireframe?: boolean
  roughness?: number
  metalness?: number
}

const SHADER_CACHE_KEY = "keycap-dyesub-v3"

/**
 * 创建带世界空间贴花的 Standard 材质。
 * 调用方负责 dispose；shared uniforms 由场景层持有与更新。
 */
export function createKeycapDyeSubMaterial(
  options: KeycapDyeSubMaterialOptions,
): MeshStandardMaterial {
  const selected = options.selected ?? false
  const mat = new MeshStandardMaterial({
    color: options.color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0.05,
    emissive: selected ? "#5b8def" : "#000000",
    emissiveIntensity: selected ? 0.35 : 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    wireframe: options.wireframe ?? false,
  })

  const keyTopYUniform = { value: options.keyTopY }
  const decalEnabledUniform = {
    value: options.decalEnabled === false ? 0 : 1,
  }

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uMap = options.shared.uMap
    shader.uniforms.uImageMatrix = options.shared.uImageMatrix
    shader.uniforms.uHasMap = options.shared.uHasMap
    shader.uniforms.uMapOpacity = options.shared.uMapOpacity
    shader.uniforms.uWrapScale = options.shared.uWrapScale
    shader.uniforms.uLegendMap = options.shared.uLegendMap
    shader.uniforms.uLegendMatrix = options.shared.uLegendMatrix
    shader.uniforms.uHasLegend = options.shared.uHasLegend
    shader.uniforms.uKeyTopY = keyTopYUniform
    shader.uniforms.uDecalEnabled = decalEnabledUniform

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
uniform float uMapOpacity;
uniform float uWrapScale;
uniform sampler2D uLegendMap;
uniform mat3 uLegendMatrix;
uniform float uHasLegend;
uniform float uKeyTopY;
uniform float uDecalEnabled;
varying vec3 vWorldPos_dye;
varying vec3 vWorldNormal_dye;
void main() {
`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      /* glsl */ `
#include <map_fragment>
{
  vec3 N = normalize(vWorldNormal_dye);
  vec3 P = vWorldPos_dye;
  // 更早把斜面当侧壁，避免侧面几乎当顶面投影
  float topW = smoothstep(0.25, 0.75, N.y);
  vec2 nXZ = N.xz;
  float nLen = length(nXZ);
  vec2 outward = nLen > 1e-4 ? nXZ / nLen : vec2(0.0);
  float drop = max(uKeyTopY - P.y, 0.0);
  float wrap = drop * uWrapScale;
  float bottomKill = N.y < -0.2 ? 0.0 : 1.0;
  vec2 sampleXZ = mix(P.xz + outward * wrap, P.xz, topW);
  if (uHasMap > 0.5 && uDecalEnabled > 0.5) {
    vec2 uv = (uImageMatrix * vec3(sampleXZ, 1.0)).xy;
    // 出界钳制到边缘：侧壁外翻不再回退成空白底色（纹理需 ClampToEdge）
    vec2 uvClamped = clamp(uv, vec2(0.0), vec2(1.0));
    vec4 tex = texture2D(uMap, uvClamped);
    float blend = tex.a * uMapOpacity * bottomKill;
    diffuseColor.rgb = mix(diffuseColor.rgb, tex.rgb, blend);
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
  mat.userData.dyeKeyTopY = keyTopYUniform
  mat.userData.dyeDecalEnabled = decalEnabledUniform
  mat.needsUpdate = true
  return mat
}

export function setDyeSubKeyTopY(
  material: MeshStandardMaterial,
  keyTopY: number,
): void {
  const u = material.userData.dyeKeyTopY as { value: number } | undefined
  if (u) u.value = keyTopY
}

export function setDyeSubDecalEnabled(
  material: MeshStandardMaterial,
  enabled: boolean,
): void {
  const u = material.userData.dyeDecalEnabled as { value: number } | undefined
  if (u) u.value = enabled ? 1 : 0
}

export function syncDyeSubAppearance(
  material: MeshStandardMaterial,
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

/** 配置贴花纹理包裹，供侧壁 UV clamp 使用 */
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
