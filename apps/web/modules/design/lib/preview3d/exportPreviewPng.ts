import type { Camera, Scene } from "three"

/**
 * 把当前 3D 预览 WebGL 画布导出为 PNG。
 * 先临时拉高渲染分辨率再读像素，避免预览 DPR 上限导致导出发糊；
 * 强制渲染一帧，避免 demand 循环下 drawing buffer 已被清空。
 */

/** 导出长边目标像素；预览面板默认只有约 300px 高，直接截屏会明显发糊。 */
const EXPORT_LONG_EDGE = 2048
const EXPORT_MAX_EDGE = 4096
const EXPORT_MIN_PIXEL_RATIO = 2

export interface Preview3dCaptureSource {
  gl: {
    domElement: HTMLCanvasElement
    render: (scene: Scene, camera: Camera) => void
    getPixelRatio: () => number
    setPixelRatio: (ratio: number) => void
    setSize: (width: number, height: number, updateStyle?: boolean) => void
  }
  scene: Scene
  camera: Camera
}

export function buildPreview3dPngFilename(templateId?: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const ts =
    `${now.getFullYear()}-` +
    `${pad(now.getMonth() + 1)}-` +
    `${pad(now.getDate())}-` +
    `${pad(now.getHours())}` +
    `${pad(now.getMinutes())}` +
    `${pad(now.getSeconds())}`
  return `keyboard-${templateId ?? "custom"}-3d-${ts}.png`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function resolveExportPixelRatio(cssWidth: number, cssHeight: number): number {
  const longEdge = Math.max(cssWidth, cssHeight, 1)
  const target = EXPORT_LONG_EDGE / longEdge
  const capped = EXPORT_MAX_EDGE / longEdge
  return Math.min(Math.max(target, EXPORT_MIN_PIXEL_RATIO), capped)
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob !== "function") {
      reject(new Error("当前浏览器不支持导出 PNG"))
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("无法导出 3D 预览 PNG"))
        return
      }
      resolve(blob)
    }, "image/png")
  })
}

export async function capturePreview3dPngBlob(
  state: Preview3dCaptureSource,
): Promise<Blob> {
  const { gl, scene, camera } = state
  const canvas = gl.domElement
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  const prevPixelRatio = gl.getPixelRatio()
  const exportPixelRatio = Math.max(
    prevPixelRatio,
    resolveExportPixelRatio(cssWidth, cssHeight),
  )

  gl.setPixelRatio(exportPixelRatio)
  gl.setSize(cssWidth, cssHeight, false)
  gl.render(scene, camera)

  try {
    return await canvasToPngBlob(canvas)
  } finally {
    gl.setPixelRatio(prevPixelRatio)
    gl.setSize(cssWidth, cssHeight, false)
    gl.render(scene, camera)
  }
}

export async function exportPreview3dPng(
  state: Preview3dCaptureSource,
  templateId?: string,
): Promise<void> {
  const blob = await capturePreview3dPngBlob(state)
  triggerDownload(blob, buildPreview3dPngFilename(templateId))
}
