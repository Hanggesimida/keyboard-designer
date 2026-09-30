import type { KeyDef } from "@/modules/design/types/design"
import {
  KEYCAP_GAP,
  KEY_PAD_LEFT,
  KEY_PAD_TOP,
  KEY_RADIUS_BASE,
} from "@/modules/design/lib/design/keycapGeometry"
import { cn } from "@workspace/ui/lib/utils"
import { type Colorway, getKeyRole, getLayoutBounds } from "../keyboard"

/** 与设计器布局 JSON 的 baseUnit 一致，键帽几何常量可直接复用。 */
const U = 54
const CASE_PADDING = 0.42

interface KeyboardSvgProps {
  keys: readonly KeyDef[]
  colorway: Colorway
  label: string
  pressedKeyIds?: ReadonlySet<string>
  showLegends?: boolean
  className?: string
  onKeyPointer?: (keyId: string, pressed: boolean) => void
}

export function KeyboardSvg({
  keys,
  colorway,
  label,
  pressedKeyIds,
  showLegends = true,
  className,
  onKeyPointer,
}: KeyboardSvgProps) {
  const bounds = getLayoutBounds(keys)
  const width = (bounds.width + CASE_PADDING * 2) * U
  const height = (bounds.height + CASE_PADDING * 2) * U

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn("block h-auto w-full select-none", className)}
    >
      <rect width={width} height={height} rx={0.38 * U} fill={colorway.case} />
      <rect
        x={CASE_PADDING * U * 0.55}
        y={CASE_PADDING * U * 0.55}
        width={width - CASE_PADDING * U * 1.1}
        height={height - CASE_PADDING * U * 1.1}
        rx={0.22 * U}
        fill={colorway.plate}
      />
      <g transform={`translate(${CASE_PADDING * U} ${CASE_PADDING * U})`}>
        {keys.map((key, index) => (
          <Keycap
            key={`${key.keyId}-${index}`}
            keyDef={key}
            colorway={colorway}
            pressed={pressedKeyIds?.has(key.keyId) ?? false}
            showLegend={showLegends}
            onKeyPointer={onKeyPointer}
          />
        ))}
      </g>
    </svg>
  )
}

function Keycap({
  keyDef,
  colorway,
  pressed,
  showLegend,
  onKeyPointer,
}: {
  keyDef: KeyDef
  colorway: Colorway
  pressed: boolean
  showLegend: boolean
  onKeyPointer?: (keyId: string, pressed: boolean) => void
}) {
  const { fill, legend } = colorway[getKeyRole(keyDef.keyId)]
  const width = keyDef.w * U - KEYCAP_GAP
  const height = keyDef.h * U - KEYCAP_GAP
  const lines = keyDef.label.split("\n").filter(Boolean)
  const isWord = lines.some((line) => line.length > 2)
  const fontSize = isWord ? 7.5 : lines.length > 1 ? 8.5 : 11

  const pointerHandlers = onKeyPointer
    ? {
        onPointerDown: () => onKeyPointer(keyDef.keyId, true),
        onPointerUp: () => onKeyPointer(keyDef.keyId, false),
        onPointerLeave: () => onKeyPointer(keyDef.keyId, false),
        style: { cursor: "pointer" },
      }
    : {}

  return (
    <g
      transform={`translate(${keyDef.x * U + KEYCAP_GAP / 2} ${keyDef.y * U + KEYCAP_GAP / 2})`}
      {...pointerHandlers}
    >
      <rect
        y={1.5}
        width={width}
        height={height}
        rx={KEY_RADIUS_BASE}
        fill="#000"
        fillOpacity={0.2}
      />
      <g
        style={{
          transform: `translateY(${pressed ? 1.5 : 0}px)`,
          transition: "transform 90ms ease-out",
        }}
      >
        <rect
          width={width}
          height={height}
          rx={KEY_RADIUS_BASE}
          style={{
            fill: pressed ? `color-mix(in oklab, var(--brand) 70%, ${fill})` : fill,
            transition: "fill 120ms ease-out",
          }}
        />
        {showLegend &&
          lines.map((line, lineIndex) => (
            <text
              key={lineIndex}
              x={KEY_PAD_LEFT + 4}
              y={KEY_PAD_TOP + 3 + fontSize * (lineIndex + 0.9) + lineIndex * 2}
              fontSize={fontSize}
              fill={legend}
              className="font-sans"
              style={{ fontWeight: 600 }}
            >
              {line}
            </text>
          ))}
      </g>
    </g>
  )
}
