import { nanoid } from "nanoid"
import { create } from "zustand"
import {
  isUserFontLoaded,
  loadUserFonts,
  unloadUserFont,
} from "@/lib/fonts/loadUserFonts"

export interface SessionFont {
  id: string
  displayName: string
  url: string
}

interface SessionFontState {
  fonts: SessionFont[]
  addFont: (file: File) => Promise<SessionFont>
  removeFont: (id: string) => void
  clearFonts: () => void
}

const MAX_FONT_SIZE = 20 * 1024 * 1024
const SUPPORTED_FONT_EXTENSION = /\.(ttf|otf)$/i

function displayNameFromFile(file: File): string {
  return file.name.replace(SUPPORTED_FONT_EXTENSION, "") || "本地字体"
}

export const useSessionFontStore = create<SessionFontState>((set, get) => ({
  fonts: [],
  async addFont(file) {
    if (!SUPPORTED_FONT_EXTENSION.test(file.name)) {
      throw new Error("仅支持 .ttf 或 .otf 字体文件")
    }
    if (file.size > MAX_FONT_SIZE) {
      throw new Error("字体文件不能超过 20 MB")
    }

    const font: SessionFont = {
      id: `local-${nanoid(10)}`,
      displayName: displayNameFromFile(file),
      url: URL.createObjectURL(file),
    }

    try {
      await loadUserFonts([font])
      if (!isUserFontLoaded(font.id)) {
        throw new Error("字体文件无法解析，请确认文件未损坏")
      }
      set({ fonts: [...get().fonts, font] })
      return font
    } catch (error) {
      URL.revokeObjectURL(font.url)
      throw error
    }
  },
  removeFont(id) {
    const font = get().fonts.find((item) => item.id === id)
    if (!font) return
    unloadUserFont(id)
    URL.revokeObjectURL(font.url)
    set({ fonts: get().fonts.filter((item) => item.id !== id) })
  },
  clearFonts() {
    get().fonts.forEach((font) => {
      unloadUserFont(font.id)
      URL.revokeObjectURL(font.url)
    })
    set({ fonts: [] })
  },
}))
