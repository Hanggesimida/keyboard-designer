import { describe, expect, it } from "vitest"
import { mapImage, roundedPolygonPath } from "./geometry"

describe("browser export geometry", () => {
  it("builds a closed rounded polygon path", () => {
    const path = roundedPolygonPath(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 0, y: 10 },
      ],
      2,
    )

    expect(path).toContain("M ")
    expect(path).toContain("A 2.00,2.00")
    expect(path).toMatch(/Z$/)
  })

  it("maps an image from design space into jig space", () => {
    expect(
      mapImage({
        image: { x: 10, y: 20, width: 30, height: 40, rotation: 15 },
        design: { x: 0, y: 0, w: 100, h: 100 },
        jig: { x: 200, y: 300, w: 50, h: 25 },
        rotated: false,
        topScale: 1,
      }),
    ).toEqual({
      x: 205,
      y: 305,
      w: 15,
      h: 10,
      rotation: 15,
    })
  })
})
