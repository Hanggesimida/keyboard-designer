import { userFontCssFamily } from "@/lib/fonts/fontRef"

export interface LoadableUserFont {
  id: string
  url: string
}

const loaded = new Set<string>()
const inflight = new Map<string, Promise<void>>()
const fontUrls = new Map<string, string>()
const fontFaces = new Map<string, FontFace>()

/** 供浏览器导出器复用已解析的用户字体源。 */
export function getLoadedUserFontUrl(id: string): string | null {
  return fontUrls.get(id) ?? null
}

export function isUserFontLoaded(id: string): boolean {
  return loaded.has(id)
}

/** 移除会话字体；远程字体仍会在下次需要时重新加载。 */
export function unloadUserFont(id: string): void {
  const face = fontFaces.get(id)
  if (face && typeof document !== "undefined") {
    document.fonts.delete(face)
  }
  fontFaces.delete(id)
  fontUrls.delete(id)
  loaded.delete(id)
  inflight.delete(id)
}

/**
 * 将用户字体注入 document.fonts（FontFace）。
 * family 名为 `uf-{id}`，与 toCssFontFamily 一致。
 */
export async function loadUserFonts(
  fonts: LoadableUserFont[],
): Promise<void> {
  if (typeof document === "undefined") return

  await Promise.all(
    fonts.map(async (font) => {
      const { id, url } = font
      if (!id || !url) return
      fontUrls.set(id, url)
      if (loaded.has(id)) return

      const existing = inflight.get(id)
      if (existing) {
        await existing
        return
      }

      const family = userFontCssFamily(id)
      const task = (async () => {
        try {
          const face = new FontFace(family, `url(${JSON.stringify(url)})`)
          await face.load()
          document.fonts.add(face)
          fontFaces.set(id, face)
          loaded.add(id)
        } catch (err) {
          fontUrls.delete(id)
          console.warn("[loadUserFonts] 加载失败", { fontId: id, family, url, err })
        } finally {
          inflight.delete(id)
        }
      })()

      inflight.set(id, task)
      await task
    }),
  )
}
