"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Keyboard } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { getLayoutData } from "@/modules/design/data/layouts"
import { codeToKeyId } from "@/modules/design/lib/design/physicalKeyMap"
import {
  COLORWAYS,
  DEFAULT_COLORWAY,
  getLayoutKeys,
  type Colorway,
} from "../keyboard"
import { KeyboardSvg } from "./keyboard-svg"

const HERO_KEYS = getLayoutKeys(getLayoutData("ansi-75"))
const HERO_KEY_IDS = new Set(HERO_KEYS.map((key) => key.keyId))
const LEGEND_BY_KEY_ID = new Map(
  HERO_KEYS.map((key) => [key.keyId, key.label.split("\n").at(-1) ?? key.label])
)
const DEMO_SEQUENCE = ["KC_H", "KC_E", "KC_L", "KC_L", "KC_O"]

export function HeroKeyboard({ className }: { className?: string }) {
  const t = useTranslations("Home.hero")
  const [colorway, setColorway] = useState<Colorway>(DEFAULT_COLORWAY)
  const [pressedKeyIds, setPressedKeyIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [lastKeyId, setLastKeyId] = useState<string | null>(null)
  const interactedRef = useRef(false)

  const setKeyPressed = useCallback((keyId: string, pressed: boolean) => {
    setPressedKeyIds((previous) => {
      if (previous.has(keyId) === pressed) return previous
      const next = new Set(previous)
      if (pressed) next.add(keyId)
      else next.delete(keyId)
      return next
    })
    if (pressed) setLastKeyId(keyId)
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent, pressed: boolean) => {
      const keyId = codeToKeyId(event.code)
      if (!keyId || !HERO_KEY_IDS.has(keyId)) return
      interactedRef.current = true
      setKeyPressed(keyId, pressed)
    }
    const handleKeyDown = (event: KeyboardEvent) => handleKey(event, true)
    const handleKeyUp = (event: KeyboardEvent) => handleKey(event, false)
    const releaseAll = () => setPressedKeyIds(new Set())

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    window.addEventListener("blur", releaseAll)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      window.removeEventListener("blur", releaseAll)
    }
  }, [setKeyPressed])

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timers = DEMO_SEQUENCE.flatMap((keyId, index) => {
      const start = 900 + index * 220
      return [
        window.setTimeout(() => {
          if (!interactedRef.current) setKeyPressed(keyId, true)
        }, start),
        window.setTimeout(() => setKeyPressed(keyId, false), start + 150),
      ]
    })
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [setKeyPressed])

  const handleKeyPointer = useCallback(
    (keyId: string, pressed: boolean) => {
      interactedRef.current = true
      setKeyPressed(keyId, pressed)
    },
    [setKeyPressed]
  )

  const lastLegend = lastKeyId ? LEGEND_BY_KEY_ID.get(lastKeyId) : null

  return (
    <div className={cn("relative mx-auto max-w-5xl", className)}>
      <div
        aria-hidden
        className="absolute inset-x-[10%] top-[30%] bottom-0 rounded-full bg-brand/20 blur-3xl dark:bg-brand/15"
      />
      <KeyboardSvg
        keys={HERO_KEYS}
        colorway={colorway}
        label={t("keyboardAlt")}
        pressedKeyIds={pressedKeyIds}
        onKeyPointer={handleKeyPointer}
        className="relative drop-shadow-[0_28px_36px_rgb(27_31_46/0.28)] dark:drop-shadow-[0_28px_40px_rgb(0_0_0/0.6)]"
      />

      <div className="relative mt-7 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div
          role="group"
          aria-label={t("colorwayLabel")}
          className="flex flex-wrap justify-center gap-2"
        >
          {COLORWAYS.map((option) => {
            const active = option.id === colorway.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setColorway(option)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "border-foreground/70 bg-card text-foreground"
                    : "border-border text-muted-foreground hover:bg-card/60 hover:text-foreground"
                )}
              >
                <span aria-hidden className="flex gap-0.5">
                  {[option.alpha.fill, option.mod.fill, option.accent.fill].map(
                    (color) => (
                      <span
                        key={color}
                        className="size-3 rounded-[3px] ring-1 ring-black/10"
                        style={{ backgroundColor: color }}
                      />
                    )
                  )}
                </span>
                {t(`colorways.${option.id}`)}
              </button>
            )
          })}
        </div>

        <p
          className="flex h-8 items-center gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <Keyboard className="size-4" aria-hidden />
          {lastLegend ? (
            <>
              {t("lastKey")}
              <kbd className="kbd-key h-7 min-w-7 px-2 text-xs">
                {lastLegend}
              </kbd>
            </>
          ) : (
            t("tryHint")
          )}
        </p>
      </div>
    </div>
  )
}
