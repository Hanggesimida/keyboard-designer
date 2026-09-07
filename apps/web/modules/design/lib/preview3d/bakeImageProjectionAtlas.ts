import type {
  ImageProjectionAtlasSpec,
  ImageProjectionItem,
} from "@/modules/design/lib/design/imageProjection"

/** 图片图集默认 4× 超采样，提升小图案近看时的清晰度。 */
export const IMAGE_ATLAS_SCALE = 4
export const IMAGE_ATLAS_MAX_SIDE = 4096

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function imageAtlasPixelSize(
  svgWidth: number,
  svgHeight: number,
  maxTextureSize: number = IMAGE_ATLAS_MAX_SIDE,
): { width: number; height: number; scale: number } {
  const w = Math.max(svgWidth, 1)
  const h = Math.max(svgHeight, 1)
  const textureLimit =
    Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? Math.min(maxTextureSize, IMAGE_ATLAS_MAX_SIDE)
      : IMAGE_ATLAS_MAX_SIDE
  const scale = Math.min(IMAGE_ATLAS_SCALE, textureLimit / w, textureLimit / h)

  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src)
  if (cached) return cached

  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous"
    }
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("图片图集素材加载失败"))
    image.src = src
  }).catch((error) => {
    imageCache.delete(src)
    throw error
  })

  imageCache.set(src, pending)
  return pending
}

function buildUnionClipPath(paths: readonly string[]): Path2D {
  const union = new Path2D()
  for (const path of paths) {
    union.addPath(new Path2D(path))
  }
  return union
}

function drawProjectionItem(
  ctx: CanvasRenderingContext2D,
  item: ImageProjectionItem,
  image: HTMLImageElement,
): void {
  const centerX = item.x + item.width / 2
  const centerY = item.y + item.height / 2

  ctx.save()
  ctx.clip(buildUnionClipPath(item.clipPaths))
  ctx.globalAlpha = item.opacity
  ctx.translate(centerX, centerY)
  ctx.rotate((item.rotationDeg * Math.PI) / 180)
  ctx.drawImage(
    image,
    -item.width / 2,
    -item.height / 2,
    item.width,
    item.height,
  )
  ctx.restore()
}

/**
 * 按 2D 元素顺序把所有键帽图片合成为一张透明图集。
 * 单个素材失败时跳过该项，不阻断其余图片。
 */
export async function bakeImageProjectionAtlas(
  canvas: HTMLCanvasElement,
  spec: ImageProjectionAtlasSpec,
  maxTextureSize?: number,
): Promise<void> {
  const { width, height, scale } = imageAtlasPixelSize(
    spec.svgWidth,
    spec.svgHeight,
    maxTextureSize,
  )
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (spec.items.length === 0) return

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.setTransform(scale, 0, 0, scale, 0, 0)

  const loaded = await Promise.all(
    spec.items.map(async (item) => {
      try {
        return await loadImage(item.src)
      } catch {
        return null
      }
    }),
  )

  for (let index = 0; index < spec.items.length; index++) {
    const item = spec.items[index]
    const image = loaded[index]
    if (item && image) drawProjectionItem(ctx, item, image)
  }
}
