import { readFile } from "node:fs/promises"
import { afterEach, describe, expect, it, vi } from "vitest"
import { textDescriptorsToPathResults } from "./font-to-path"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("browser font outlining", () => {
  it("converts bundled font text into an SVG path", async () => {
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      const relativePath = String(input).replace(/^\/+/, "")
      const file = await readFile(
        new URL(`../../../public/${relativePath}`, import.meta.url),
      )
      return new Response(new Uint8Array(file), { status: 200 })
    })

    const [result] = await textDescriptorsToPathResults([
      {
        id: "label",
        x: 50,
        y: 30,
        fontSize: 12,
        fontFamily: "var(--font-ibm-plex-mono)",
        lines: ["Esc"],
        lineHeightRatio: 1.2,
        letterSpacing: 0,
        fill: "#ffffff",
      },
    ])

    expect(result?.id).toBe("label")
    expect(result?.pathD).toMatch(/^M/)
  })
})
