import { isSvgFile, readSvgFile } from "./svgUtils"

export interface CanvasImageFileData {
  src: string
  width: number
  height: number
  isSvg: boolean
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) =>
      resolve(typeof event.target?.result === "string" ? event.target.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export function readImageDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve(null)
    image.src = src
  })
}

export async function readCanvasImageFile(
  file: File,
): Promise<CanvasImageFileData | null> {
  if (isSvgFile(file)) {
    const result = await readSvgFile(file)
    return result
      ? {
          src: result.src,
          width: result.w,
          height: result.h,
          isSvg: true,
        }
      : null
  }

  if (!file.type.startsWith("image/")) return null
  const src = await readFileAsDataUrl(file)
  if (!src) return null
  const dimensions = await readImageDimensions(src)
  if (!dimensions) return null

  return { src, ...dimensions, isSvg: false }
}
