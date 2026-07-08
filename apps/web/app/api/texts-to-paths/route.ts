import { NextRequest, NextResponse } from "next/server"
import {
  textDescriptorsToPathResults,
  type TextDescriptor,
} from "@/lib/jig/fontToPath"
import { filterAllowedUserFontAssets } from "@/lib/fonts/fontAssetUrlGuard"

export const runtime = "nodejs"

/**
 * POST /api/texts-to-paths
 *
 * Body:  { texts: TextDescriptor[]; fontAssets?: Record<string, { url: string }> }
 * Response: { results: Array<{ id: string; pathD: string | null }> }
 *
 * 将一组文字描述符批量转换为 SVG path d 字符串。
 * pathD=null 表示无法转曲（无字体文件 / 加载失败），调用方应保留原 <text> 元素。
 */
export async function POST(req: NextRequest) {
  let body: {
    texts: TextDescriptor[]
    fontAssets?: Record<string, { url: string }>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是有效的 JSON" }, { status: 400 })
  }

  if (!Array.isArray(body?.texts)) {
    return NextResponse.json({ error: "缺少 texts 字段（数组）" }, { status: 400 })
  }

  try {
    const userAssets = filterAllowedUserFontAssets(body.fontAssets)
    const results = await textDescriptorsToPathResults(body.texts, userAssets)
    return NextResponse.json({ results })
  } catch (err) {
    console.error("[texts-to-paths] 转曲失败:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "转曲时发生未知错误" },
      { status: 500 },
    )
  }
}
