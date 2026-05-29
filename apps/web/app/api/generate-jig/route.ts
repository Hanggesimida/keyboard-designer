import { NextRequest, NextResponse } from "next/server"
import { generateJigSvg, type DesignPayload } from "@/lib/jig/generateJig"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  let body: { design: DesignPayload }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求体必须是有效的 JSON" }, { status: 400 })
  }

  if (!body?.design || typeof body.design !== "object") {
    return NextResponse.json({ error: "缺少 design 字段" }, { status: 400 })
  }

  try {
    const svgString = await generateJigSvg(body.design)

    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, "0")
    const ts =
      `${now.getFullYear()}-` +
      `${pad(now.getMonth() + 1)}-` +
      `${pad(now.getDate())}-` +
      `${pad(now.getHours())}` +
      `${pad(now.getMinutes())}` +
      `${pad(now.getSeconds())}`
    const filename = `jig-${body.design.templateId ?? "custom"}-${ts}.svg`

    return new NextResponse(svgString, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error("[generate-jig] 生成失败:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成治具 SVG 时发生未知错误" },
      { status: 500 },
    )
  }
}
