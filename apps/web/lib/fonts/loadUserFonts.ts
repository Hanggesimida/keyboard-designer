import { userFontCssFamily } from "@/lib/fonts/fontRef"

export interface LoadableUserFont {
  id: string
  url: string
}

const loaded = new Set<string>()
const inflight = new Map<string, Promise<void>>()

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
          loaded.add(id)
        } catch (err) {
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
