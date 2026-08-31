import { afterEach, describe, expect, it, vi } from "vitest"
import { generateJigSvg } from "./generate-jig"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("browser jig export", () => {
  it("injects generated key layers into the jig template without an API", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).endsWith(".json")) {
        return new Response(
          JSON.stringify([
            {
              key_id: "KC_GRV",
              unit: 1,
              row_level: "R4",
              top_face_x: 10,
              top_face_y: 10,
              top_face_w: 32,
              top_face_h: 38,
              bottom_box_x: 5,
              bottom_box_y: 5,
              bottom_box_w: 42,
              bottom_box_h: 48,
            },
          ]),
          { status: 200 },
        )
      }
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg"><defs></defs><g id="template"/></svg>',
        { status: 200 },
      )
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await generateJigSvg({
      templateId: "ansi-61",
      globalKeycapStyle: {
        color: "#123456",
        labelColor: "#ffffff",
        fontSize: 7,
      },
      layers: [{ id: "layer", labelsHidden: true }],
      layerKeycapOverrides: {},
      canvasElements: [],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toContain('id="jig-color-layer"')
    expect(result).toContain('fill="#123456"')
    expect(result).toContain('id="jig-label-layer"')
    expect(result).toContain('id="template"')
  })
})
