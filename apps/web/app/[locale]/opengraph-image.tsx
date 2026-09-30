import { ImageResponse } from "next/og"
import { getLayoutData } from "@/modules/design/data/layouts"
import {
  DEFAULT_COLORWAY,
  getKeyRole,
  getLayoutBounds,
  getLayoutKeys,
} from "@/modules/home/keyboard"

export const alt = "Keyboard Designer — design keycaps in your browser"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const KEYS = getLayoutKeys(getLayoutData("ansi-75"))
const BOUNDS = getLayoutBounds(KEYS)
const UNIT = 38

export default function OpenGraphImage() {
  const colorway = DEFAULT_COLORWAY

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#f3f1e9",
        color: "#1b1f2e",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 26,
            color: "#e0703a",
          }}
        >
          OPEN SOURCE · MIT
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            marginTop: 16,
            letterSpacing: -2,
          }}
        >
          Keyboard Designer
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            marginTop: 12,
            color: "#67665f",
          }}
        >
          Design a full keycap set right in your browser.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "relative",
          alignSelf: "center",
          width: BOUNDS.width * UNIT + 28,
          height: BOUNDS.height * UNIT + 28,
          borderRadius: 18,
          background: colorway.case,
        }}
      >
        {KEYS.map((key, index) => {
          const { fill } = colorway[getKeyRole(key.keyId)]
          return (
            <div
              key={`${key.keyId}-${index}`}
              style={{
                position: "absolute",
                display: "flex",
                left: 14 + key.x * UNIT + 1,
                top: 14 + key.y * UNIT + 1,
                width: key.w * UNIT - 2,
                height: key.h * UNIT - 2,
                borderRadius: 5,
                background: fill,
                boxShadow: "0 1.5px 0 rgba(0,0,0,0.2)",
              }}
            />
          )
        })}
      </div>
    </div>,
    size
  )
}
