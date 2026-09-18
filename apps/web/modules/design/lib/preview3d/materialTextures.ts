import {
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three"

export const WOOD_GRAIN_TEXTURE_PATH =
  "/textures/materials/wood-grain.webp"

/** 配置共享木纹颜色贴图；调用方不负责 dispose drei 缓存的纹理。 */
export function configureWoodGrainTexture(
  texture: Texture,
  maxAnisotropy: number,
): Texture {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = Math.max(1, Math.min(maxAnisotropy, 8))
  texture.needsUpdate = true
  return texture
}
