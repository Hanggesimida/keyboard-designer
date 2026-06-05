"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { colord } from "colord"
import { Pipette, Trash2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  isGradientValue,
  gradientToCSS,
  parseCssLinearGradient,
  interpolateGradientColor,
  makeDefaultGradient,
  type LinearGradient,
  type GradientStop,
} from "@/modules/design/lib/design/gradientUtils"

// ─── Local types ──────────────────────────────────────────────────────────────

interface HsvColor {
  h: number // 0–360
  s: number // 0–100
  v: number // 0–100
}

type ColorMode = "solid" | "gradient"

// ─── Local utilities ──────────────────────────────────────────────────────────

function hexToHsv(hex: string): HsvColor {
  const { h, s, v } = colord(hex).toHsv()
  return { h, s, v }
}

function hsvToHex({ h, s, v }: HsvColor): string {
  return colord({ h, s, v }).toHex()
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function isValidHex(v: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

// ─── SV gradient panel ────────────────────────────────────────────────────────

interface SvPanelProps {
  hue: number
  saturation: number
  value: number
  onChange: (s: number, v: number) => void
}

function SvPanel({ hue, saturation, value, onChange }: SvPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const pick = useCallback((clientX: number, clientY: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const s = clamp((clientX - rect.left) / rect.width, 0, 1)
    const v = clamp((clientY - rect.top) / rect.height, 0, 1)
    onChangeRef.current(Math.round(s * 100), Math.round((1 - v) * 100))
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current) pick(e.clientX, e.clientY)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [pick])

  const hueHex = colord({ h: hue, s: 100, v: 100 }).toHex()

  return (
    <div
      ref={ref}
      className="relative h-32 w-full cursor-crosshair select-none rounded-md"
      style={{
        background: `
          linear-gradient(to bottom, transparent, #000),
          linear-gradient(to right, #fff, ${hueHex})
        `,
      }}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX, e.clientY)
      }}
    >
      <div
        className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${saturation}%`,
          top: `${100 - value}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  )
}

// ─── Hue slider ───────────────────────────────────────────────────────────────

interface HueSliderProps {
  hue: number
  onChange: (h: number) => void
}

function HueSlider({ hue, onChange }: HueSliderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const pick = useCallback((clientX: number) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = clamp((clientX - rect.left) / rect.width, 0, 1)
    onChangeRef.current(Math.round(x * 360))
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current) pick(e.clientX)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [pick])

  return (
    <div
      ref={ref}
      className="relative h-3 w-full cursor-pointer select-none rounded-full"
      style={{
        background:
          "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
      }}
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX)
      }}
    >
      <div
        className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
        style={{
          left: `${(hue / 360) * 100}%`,
          boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
        }}
      />
    </div>
  )
}

// ─── Gradient stops bar ───────────────────────────────────────────────────────

interface GradientStopsBarProps {
  gradient: LinearGradient
  selectedStopId: string
  onSelectStop: (id: string) => void
  onMoveStop: (id: string, pos: number) => void
  onAddStop: (pos: number, color: string) => void
  onRemoveStop: (id: string) => void
}

function GradientStopsBar({
  gradient,
  selectedStopId,
  onSelectStop,
  onMoveStop,
  onAddStop,
  onRemoveStop,
}: GradientStopsBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)
  const onMoveRef = useRef(onMoveStop)
  onMoveRef.current = onMoveStop

  const getPos = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    return Math.round(clamp((clientX - rect.left) / rect.width, 0, 1) * 100)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingId.current) onMoveRef.current(draggingId.current, getPos(e.clientX))
    }
    const onUp = () => {
      draggingId.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [getPos])

  // Always render left-to-right for the preview bar
  const previewCSS = (() => {
    const sorted = [...gradient.stops].sort((a, b) => a.pos - b.pos)
    return `linear-gradient(to right, ${sorted.map((s) => `${s.color} ${s.pos}%`).join(", ")})`
  })()

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const pos = getPos(e.clientX)
    const color = interpolateGradientColor(gradient, pos)
    onAddStop(pos, color)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-0.5">
      {/* Gradient preview bar — click to add a stop */}
      <div
        className="h-5 w-full cursor-crosshair rounded-md"
        style={{ background: previewCSS }}
        onClick={handleBarClick}
      />
      {/* Handle track */}
      <div className="relative h-4 w-full select-none">
        {gradient.stops.map((stop: GradientStop) => {
          const isSelected = stop.id === selectedStopId
          return (
            <div
              key={stop.id}
              className="absolute top-0 h-full"
              style={{ left: `${stop.pos}%`, transform: "translateX(-50%)" }}
            >
              <div
                className={`size-4 cursor-grab rounded-sm border-2 border-white active:cursor-grabbing ${
                  isSelected ? "ring-1 ring-offset-[1px] ring-blue-400" : ""
                }`}
                style={{
                  backgroundColor: stop.color,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  draggingId.current = stop.id
                  e.currentTarget.setPointerCapture(e.pointerId)
                  onSelectStop(stop.id)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (gradient.stops.length > 2) onRemoveStop(stop.id)
                }}
              />
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        单击渐变条添加色标，双击色标删除
      </p>
    </div>
  )
}

// ─── Angle input ──────────────────────────────────────────────────────────────

function AngleInput({
  angle,
  onChange,
}: {
  angle: number
  onChange: (a: number) => void
}) {
  const [inputVal, setInputVal] = useState(String(angle))

  useEffect(() => {
    setInputVal(String(angle))
  }, [angle])

  const commit = (val: string) => {
    const n = parseInt(val)
    if (!isNaN(n)) onChange(((n % 360) + 360) % 360)
    else setInputVal(String(angle))
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
        方向角
      </span>
      <Input
        type="number"
        value={inputVal}
        min={0}
        max={359}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={() => commit(inputVal)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(inputVal)
        }}
        className="h-6 w-14 text-center font-mono text-[11px]"
      />
      <span className="text-[11px] text-muted-foreground">°</span>
    </div>
  )
}

// ─── Hex + preview + eyedropper row ──────────────────────────────────────────

interface ColorInputRowProps {
  hex: string
  onHexChange: (val: string) => void
  onHexBlur: () => void
  onEyeDropper?: () => void
  supportsEyeDropper: boolean
}

function ColorInputRow({
  hex,
  onHexChange,
  onHexBlur,
  onEyeDropper,
  supportsEyeDropper,
}: ColorInputRowProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="size-6 shrink-0 rounded border border-border"
        style={{ backgroundColor: hex }}
      />
      <Input
        type="text"
        value={hex}
        onChange={(e) => onHexChange(e.target.value)}
        onBlur={onHexBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        spellCheck={false}
        maxLength={7}
        className="h-6 flex-1 font-mono text-[11px] tracking-wider"
      />
      {supportsEyeDropper && (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          title="从屏幕取色"
          onClick={onEyeDropper}
          className="shrink-0 text-muted-foreground"
        >
          <Pipette className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface HexColorPickerProps {
  /** Accepts a hex string (#rrggbb) or a CSS linear-gradient() string. */
  value: string
  onChange: (value: string) => void
}

export function HexColorPicker({ value, onChange }: HexColorPickerProps) {
  // ── Mode ──────────────────────────────────────────────────────────────────

  const [mode, setMode] = useState<ColorMode>(
    isGradientValue(value) ? "gradient" : "solid",
  )

  // ── Solid color state ──────────────────────────────────────────────────────

  const solidHex = isValidHex(value) ? value : "#ff0000"
  const [hsv, setHsv] = useState<HsvColor>(() => hexToHsv(solidHex))
  const [hexInput, setHexInput] = useState(solidHex)

  // ── Gradient state ─────────────────────────────────────────────────────────

  const [gradient, setGradient] = useState<LinearGradient>(() => {
    if (isGradientValue(value))
      return parseCssLinearGradient(value) ?? makeDefaultGradient(solidHex)
    return makeDefaultGradient(solidHex)
  })

  const [selectedStopId, setSelectedStopId] = useState<string>(
    () => gradient.stops[0]?.id ?? "",
  )

  const getStop = (g: LinearGradient, id: string) =>
    g.stops.find((s) => s.id === id) ?? g.stops[0]

  const initStop = getStop(gradient, selectedStopId)
  const [stopHsv, setStopHsv] = useState<HsvColor>(() =>
    initStop ? hexToHsv(initStop.color) : hexToHsv("#ff0000"),
  )
  const [stopHexInput, setStopHexInput] = useState(
    () => initStop?.color ?? "#ff0000",
  )

  // ── Sync from external value ───────────────────────────────────────────────

  useEffect(() => {
    if (isGradientValue(value)) {
      const parsed = parseCssLinearGradient(value)
      if (parsed) {
        setGradient(parsed)
        const sel = getStop(parsed, selectedStopId)
        if (sel) {
          setStopHsv(hexToHsv(sel.color))
          setStopHexInput(sel.color)
        }
      }
    } else if (isValidHex(value)) {
      setHsv(hexToHsv(value))
      setHexInput(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // ── Solid handlers ─────────────────────────────────────────────────────────

  const emitSolid = useCallback(
    (next: HsvColor) => {
      const hex = hsvToHex(next)
      setHexInput(hex)
      onChange(hex)
    },
    [onChange],
  )

  const handleSvChange = useCallback(
    (s: number, v: number) => {
      const next = { ...hsv, s, v }
      setHsv(next)
      emitSolid(next)
    },
    [hsv, emitSolid],
  )

  const handleHueChange = useCallback(
    (h: number) => {
      const next = { ...hsv, h }
      setHsv(next)
      emitSolid(next)
    },
    [hsv, emitSolid],
  )

  // ── Gradient helpers ───────────────────────────────────────────────────────

  const emitGradient = useCallback(
    (g: LinearGradient) => {
      // Defer parent updates: emitGradient is called inside setGradient updaters,
      // and synchronous onChange would update ColorRow during HexColorPicker render.
      queueMicrotask(() => {
        onChange(gradientToCSS(g))
      })
    },
    [onChange],
  )

  const applyStopColor = useCallback(
    (hex: string, nextHsv: HsvColor) => {
      setStopHsv(nextHsv)
      setStopHexInput(hex)
      setGradient((prev) => {
        const next = {
          ...prev,
          stops: prev.stops.map((s) =>
            s.id === selectedStopId ? { ...s, color: hex } : s,
          ),
        }
        emitGradient(next)
        return next
      })
    },
    [selectedStopId, emitGradient],
  )

  const handleStopSvChange = useCallback(
    (s: number, v: number) => {
      const next = { ...stopHsv, s, v }
      applyStopColor(hsvToHex(next), next)
    },
    [stopHsv, applyStopColor],
  )

  const handleStopHueChange = useCallback(
    (h: number) => {
      const next = { ...stopHsv, h }
      applyStopColor(hsvToHex(next), next)
    },
    [stopHsv, applyStopColor],
  )

  const handleMoveStop = useCallback(
    (id: string, pos: number) => {
      setGradient((prev) => {
        const next = {
          ...prev,
          stops: prev.stops.map((s) => (s.id === id ? { ...s, pos } : s)),
        }
        emitGradient(next)
        return next
      })
    },
    [emitGradient],
  )

  const handleAddStop = useCallback(
    (pos: number, color: string) => {
      const id = `s${Date.now()}`
      setGradient((prev) => {
        const next = { ...prev, stops: [...prev.stops, { id, pos, color }] }
        emitGradient(next)
        return next
      })
      setSelectedStopId(id)
      setStopHsv(hexToHsv(color))
      setStopHexInput(color)
    },
    [emitGradient],
  )

  const handleRemoveStop = useCallback(
    (id: string) => {
      setGradient((prev) => {
        if (prev.stops.length <= 2) return prev
        const next = { ...prev, stops: prev.stops.filter((s) => s.id !== id) }
        emitGradient(next)
        return next
      })
      if (id === selectedStopId) {
        const fallback = gradient.stops.find((s) => s.id !== id)
        if (fallback) {
          setSelectedStopId(fallback.id)
          setStopHsv(hexToHsv(fallback.color))
          setStopHexInput(fallback.color)
        }
      }
    },
    [emitGradient, selectedStopId, gradient.stops],
  )

  const handleAngleChange = useCallback(
    (angle: number) => {
      setGradient((prev) => {
        const next = { ...prev, angle }
        emitGradient(next)
        return next
      })
    },
    [emitGradient],
  )

  const handleSelectStop = useCallback(
    (id: string) => {
      setSelectedStopId(id)
      const stop = gradient.stops.find((s) => s.id === id)
      if (stop) {
        setStopHsv(hexToHsv(stop.color))
        setStopHexInput(stop.color)
      }
    },
    [gradient.stops],
  )

  // ── Mode switch ────────────────────────────────────────────────────────────

  const handleModeSwitch = (next: ColorMode) => {
    setMode(next)
    if (next === "gradient") {
      const currentHex = hsvToHex(hsv)
      const g = makeDefaultGradient(currentHex)
      setGradient(g)
      setSelectedStopId(g.stops[0]!.id)
      setStopHsv(hexToHsv(currentHex))
      setStopHexInput(currentHex)
      onChange(gradientToCSS(g))
    } else {
      const firstStop = gradient.stops[0]
      const hex = firstStop?.color ?? hsvToHex(hsv)
      const nextHsv = hexToHsv(hex)
      setHsv(nextHsv)
      setHexInput(hex)
      onChange(hex)
    }
  }

  // ── EyeDropper ────────────────────────────────────────────────────────────

  const supportsEyeDropper =
    typeof window !== "undefined" && "EyeDropper" in window

  const handleEyeDropper = useCallback(async () => {
    if (!supportsEyeDropper) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eyeDropper = new (window as any).EyeDropper()
      const result: { sRGBHex: string } = await eyeDropper.open()
      const hex = result.sRGBHex
      if (!isValidHex(hex)) return
      if (mode === "gradient") {
        applyStopColor(hex, hexToHsv(hex))
      } else {
        const next = hexToHsv(hex)
        setHsv(next)
        setHexInput(hex)
        onChange(hex)
      }
    } catch {
      // user cancelled
    }
  }, [supportsEyeDropper, mode, applyStopColor, onChange])

  // ── Render ────────────────────────────────────────────────────────────────

  const previewHex = hsvToHex(hsv)
  const stopPreviewHex = hsvToHex(stopHsv)

  const triggerStyle = isGradientValue(value)
  ? { background: value, boxShadow: 'inset 0 0 0 1px var(--border)' }
  : { backgroundColor: value };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="选择颜色"
          className="size-7 shrink-0 cursor-pointer rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          style={triggerStyle}
        />
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-3"
        align="start"
        side="left"
        sideOffset={16}
        avoidCollisions={true}
        collisionPadding={8}
      >
        {/* Mode tabs */}
        <div className="mb-3 flex rounded-md bg-muted p-0.5 text-[11px]">
          {(["solid", "gradient"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`flex-1 rounded py-1 font-medium transition-colors ${
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handleModeSwitch(m)}
            >
              {m === "solid" ? "纯色" : "渐变"}
            </button>
          ))}
        </div>

        {mode === "solid" ? (
          /* ── Solid mode ─────────────────────────────────────────────── */
          <div className="flex flex-col gap-3">
            <SvPanel
              hue={hsv.h}
              saturation={hsv.s}
              value={hsv.v}
              onChange={handleSvChange}
            />
            <HueSlider hue={hsv.h} onChange={handleHueChange} />
            <ColorInputRow
              hex={hexInput}
              onHexChange={(val) => {
                setHexInput(val)
                if (isValidHex(val)) {
                  const next = hexToHsv(val)
                  setHsv(next)
                  onChange(val)
                }
              }}
              onHexBlur={() => {
                if (!isValidHex(hexInput)) setHexInput(previewHex)
              }}
              onEyeDropper={handleEyeDropper}
              supportsEyeDropper={supportsEyeDropper}
            />
          </div>
        ) : (
          /* ── Gradient mode ──────────────────────────────────────────── */
          <div className="flex flex-col gap-3">
            {/* Gradient stops bar */}
            <GradientStopsBar
              gradient={gradient}
              selectedStopId={selectedStopId}
              onSelectStop={handleSelectStop}
              onMoveStop={handleMoveStop}
              onAddStop={handleAddStop}
              onRemoveStop={handleRemoveStop}
            />

            {/* Angle + delete stop row */}
            <div className="flex items-center justify-between">
              <AngleInput
                angle={gradient.angle}
                onChange={handleAngleChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="删除选中色标"
                disabled={gradient.stops.length <= 2}
                onClick={() => handleRemoveStop(selectedStopId)}
                className="shrink-0 text-muted-foreground"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>

            {/* Color picker for the selected stop */}
            <SvPanel
              hue={stopHsv.h}
              saturation={stopHsv.s}
              value={stopHsv.v}
              onChange={handleStopSvChange}
            />
            <HueSlider hue={stopHsv.h} onChange={handleStopHueChange} />
            <ColorInputRow
              hex={stopHexInput}
              onHexChange={(val) => {
                setStopHexInput(val)
                if (isValidHex(val)) applyStopColor(val, hexToHsv(val))
              }}
              onHexBlur={() => {
                if (!isValidHex(stopHexInput)) setStopHexInput(stopPreviewHex)
              }}
              onEyeDropper={handleEyeDropper}
              supportsEyeDropper={supportsEyeDropper}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
