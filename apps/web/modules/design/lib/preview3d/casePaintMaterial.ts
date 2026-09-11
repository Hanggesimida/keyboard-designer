import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  LinearFilter,
  NoColorSpace,
  RGBAFormat,
  UnsignedByteType,
  Vector2,
  type MeshStandardMaterial,
  type Texture,
} from "three"
import {
  interpolateGradientColor,
  type LinearGradient,
} from "@/modules/design/lib/design/gradientUtils"

const GRADIENT_TEXTURE_WIDTH = 256

export interface CasePaintUniforms {
  enabled: { value: number }
  gradientMap: { value: Texture | null }
  start: { value: Vector2 }
  end: { value: Vector2 }
}

/** 在 CPU 端生成线性空间色带，shader 只负责按外壳位置采样。 */
export function createCaseGradientTexture(
  gradient: LinearGradient,
): DataTexture {
  const data = new Uint8Array(GRADIENT_TEXTURE_WIDTH * 4)
  for (let x = 0; x < GRADIENT_TEXTURE_WIDTH; x++) {
    const color = new Color(
      interpolateGradientColor(
        gradient,
        (x / (GRADIENT_TEXTURE_WIDTH - 1)) * 100,
      ),
    )
    const offset = x * 4
    data[offset] = Math.round(color.r * 255)
    data[offset + 1] = Math.round(color.g * 255)
    data[offset + 2] = Math.round(color.b * 255)
    data[offset + 3] = 255
  }

  const texture = new DataTexture(
    data,
    GRADIENT_TEXTURE_WIDTH,
    1,
    RGBAFormat,
    UnsignedByteType,
  )
  texture.colorSpace = NoColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/**
 * 给标准 PBR 材质安装稳定的 world-space XZ 渐变扩展。
 * 统一 shader 程序通过 uniform 在纯色与渐变间切换，拖动色标时不会反复编译。
 */
export function installCasePaintShader(
  material: MeshStandardMaterial,
): CasePaintUniforms {
  const uniforms: CasePaintUniforms = {
    enabled: { value: 0 },
    gradientMap: { value: null },
    start: { value: new Vector2() },
    end: { value: new Vector2(1, 0) },
  }

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCaseGradientEnabled = uniforms.enabled
    shader.uniforms.uCaseGradientMap = uniforms.gradientMap
    shader.uniforms.uCaseGradientStart = uniforms.start
    shader.uniforms.uCaseGradientEnd = uniforms.end

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec2 vCasePaintWorldPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vCasePaintWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xz;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uCaseGradientEnabled;
uniform sampler2D uCaseGradientMap;
uniform vec2 uCaseGradientStart;
uniform vec2 uCaseGradientEnd;
varying vec2 vCasePaintWorldPosition;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
if (uCaseGradientEnabled > 0.5) {
  vec2 caseGradientAxis = uCaseGradientEnd - uCaseGradientStart;
  float caseGradientLengthSq = max(dot(caseGradientAxis, caseGradientAxis), 0.000001);
  float caseGradientT = clamp(
    dot(vCasePaintWorldPosition - uCaseGradientStart, caseGradientAxis) /
      caseGradientLengthSq,
    0.0,
    1.0
  );
  diffuseColor.rgb *= texture2D(
    uCaseGradientMap,
    vec2(caseGradientT, 0.5)
  ).rgb;
}`,
      )
  }
  material.customProgramCacheKey = () => "keyboard-case-paint-v1"
  material.needsUpdate = true
  return uniforms
}
