/**
 * 字体引用约定：
 * - 内置：`var(--font-xxx)`（设计 JSON / store 原样）
 * - 用户：`uf:{userFontId}`（设计 JSON / store）
 * - CSS family 名：`uf-{userFontId}`（FontFace / style.fontFamily）
 */

const USER_FONT_REF_RE = /^uf:([A-Za-z0-9_-]+)$/
const USER_FONT_CSS_RE = /^uf-([A-Za-z0-9_-]+)$/

export function isUserFontRef(ref: string): boolean {
  return USER_FONT_REF_RE.test(ref.trim())
}

export function parseUserFontId(ref: string): string | null {
  const m = USER_FONT_REF_RE.exec(ref.trim())
  return m?.[1] ?? null
}

export function toUserFontRef(id: string): string {
  return `uf:${id}`
}

/** FontFace / CSS font-family 使用的族名 */
export function userFontCssFamily(id: string): string {
  return `uf-${id}`
}

/**
 * 将 store/设计里的 fontFamily 转为可直接用于 style.fontFamily 的值。
 * `uf:{id}` → `uf-{id}`；其余原样返回。
 */
export function toCssFontFamily(ref: string): string {
  const id = parseUserFontId(ref)
  return id ? userFontCssFamily(id) : ref
}

/**
 * 将 CSS / SVG 中可能出现的 `uf-{id}` 归一为设计引用 `uf:{id}`。
 */
export function normalizeFontFamilyRef(value: string): string {
  const trimmed = value.trim().replace(/^["']|["']$/g, "")
  const cssMatch = USER_FONT_CSS_RE.exec(trimmed)
  if (cssMatch?.[1]) return toUserFontRef(cssMatch[1])
  return trimmed
}

export function collectUserFontIdsFromRefs(
  ...refs: Array<string | null | undefined>
): string[] {
  const ids = new Set<string>()
  for (const ref of refs) {
    if (!ref) continue
    const id = parseUserFontId(normalizeFontFamilyRef(ref))
    if (id) ids.add(id)
  }
  return [...ids]
}
