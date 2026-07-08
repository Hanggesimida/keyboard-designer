/**
 * 校验导出转曲用的远程字体 URL，防止 SSRF。
 * 允许：TENCENT_COS_DOMAIN 主机；开发环境允许 localhost。
 */
export function isAllowedFontAssetUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false
  }

  const cosDomain =
    process.env.TENCENT_COS_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_COS_DOMAIN?.trim()
  if (cosDomain) {
    try {
      const cosHost = new URL(
        cosDomain.includes("://") ? cosDomain : `https://${cosDomain}`,
      ).hostname
      if (parsed.hostname === cosHost || parsed.hostname.endsWith(`.${cosHost}`)) {
        return true
      }
    } catch {
      // ignore malformed env
    }
  }

  // 路径形如 /fonts/blobs/{hash}.* 时，开发环境放宽为任意 https（便于本地未配域名）
  if (
    process.env.NODE_ENV !== "production" &&
    parsed.protocol === "https:" &&
    /^\/fonts\/blobs\/[a-f0-9]+\.(ttf|otf)$/i.test(parsed.pathname)
  ) {
    return true
  }

  if (process.env.NODE_ENV !== "production") {
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1"
    ) {
      return true
    }
  }

  return false
}

export function filterAllowedUserFontAssets(
  input: unknown,
): Record<string, { url: string }> {
  const out: Record<string, { url: string }> = {}
  if (!input || typeof input !== "object") return out

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!key.startsWith("uf:")) continue
    if (!value || typeof value !== "object") continue
    const url = (value as { url?: unknown }).url
    if (typeof url !== "string" || !isAllowedFontAssetUrl(url)) continue
    out[key] = { url }
  }
  return out
}
