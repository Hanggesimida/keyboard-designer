"use client"

import { useRef, useState, type ReactNode, type MouseEvent, type KeyboardEvent } from "react"
import { useTranslations } from "next-intl"
import { Check, ChevronDown, Trash2, Upload } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import {
  FONT_CATEGORIES,
  FONT_OPTIONS,
  type FontCategory,
  type FontOption,
} from "@/modules/design/components/sidebar/sections/right/font-options"
import { toCssFontFamily, toUserFontRef } from "@/lib/fonts/fontRef"
import { useSessionFontStore } from "@/lib/fonts/sessionFontStore"

interface FontFamilySelectProps {
  label: ReactNode
  triggerId?: string
  /** 当前展示用字体 CSS 值（混合时可不传 style） */
  effectiveFontFamily: string
  isMixed?: boolean
  disabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (family: string) => void
}

export function FontFamilySelect({
  label,
  triggerId,
  effectiveFontFamily,
  isMixed,
  disabled,
  open,
  onOpenChange,
  onPick,
}: FontFamilySelectProps) {
  const t = useTranslations("Design.fonts")
  const tCommon = useTranslations("Common")
  const tFonts = useTranslations("Fonts")
  const sessionFonts = useSessionFontStore((state) => state.fonts)
  const addSessionFont = useSessionFontStore((state) => state.addFont)
  const removeSessionFont = useSessionFontStore((state) => state.removeFont)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isSessionFontLoading, setIsSessionFontLoading] = useState(false)

  const FONT_ERROR_KEYS = ["ttfOnly", "tooLarge", "parseFailed"] as const
  const CATEGORY_I18N: Record<FontCategory, "myFonts" | "sans" | "mono" | "serif" | "cjk"> = {
    custom: "myFonts",
    sans: "sans",
    mono: "mono",
    serif: "serif",
    cjk: "cjk",
  }

  const customOptions: FontOption[] = sessionFonts.map((f) => ({
    value: toUserFontRef(f.id),
    label: f.displayName === "localFont" ? t("localFont") : f.displayName,
    category: "custom",
    bold: false,
    italic: false,
  }))

  const allOptions = [...customOptions, ...FONT_OPTIONS]

  const currentLabel = isMixed
    ? tCommon("mixed")
    : (allOptions.find((f) => f.value === effectiveFontFamily)?.label ?? tCommon("custom"))

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploadError(null)
    try {
      setIsSessionFontLoading(true)
      const font = await addSessionFont(file)
      onPick(toUserFontRef(font.id))
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      setUploadError(
        (FONT_ERROR_KEYS as readonly string[]).includes(msg)
          ? tFonts(msg as (typeof FONT_ERROR_KEYS)[number])
          : t("uploadFailed"),
      )
    } finally {
      setIsSessionFontLoading(false)
    }
  }

  const handleDelete = async (e: MouseEvent, id: string, ref: string) => {
    e.stopPropagation()
    if (!confirm(t("removeConfirm"))) {
      return
    }
    try {
      removeSessionFont(id)
      if (effectiveFontFamily === ref) {
        onPick("var(--font-ibm-plex-mono)")
      }
    } catch (err) {
      console.error("[FontFamilySelect] 删除失败:", err)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={triggerId}
        className="text-[11px] font-normal text-muted-foreground"
      >
        {label}
        {isMixed && (
            <span className="ml-1.5 text-[10px] text-chart-4/80">{tCommon("mixed")}</span>
        )}
      </Label>
      <Popover
        open={disabled ? false : open}
        onOpenChange={disabled ? undefined : onOpenChange}
      >
        <PopoverTrigger
          render={
            <Button
              id={triggerId}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-expanded={open}
              className="h-8 w-full justify-between gap-2 px-2.5 font-normal shadow-none cursor-pointer"
              style={{
                fontFamily: isMixed
                  ? undefined
                  : toCssFontFamily(effectiveFontFamily),
              }}
            />
          }
        >
            <span className="min-w-0 flex-1 truncate text-left text-xs">
              {currentLabel}
            </span>
            <ChevronDown className="size-3.5 shrink-0 opacity-60 cursor-pointer" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-(--anchor-width) p-1"
        >
          <div className="flex max-h-72 flex-col gap-px overflow-y-auto p-0.5">
            {FONT_CATEGORIES.map((cat) => {
              const items =
                cat.key === "custom"
                  ? customOptions
                  : FONT_OPTIONS.filter((f) => f.category === cat.key)

              if (cat.key !== "custom" && items.length === 0) return null

              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between gap-1 px-2 py-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {t(CATEGORY_I18N[cat.key])}
                    </span>
                    {cat.key === "custom" && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                        disabled={isSessionFontLoading}
                        onClick={() => fileInputRef.current?.click()}
                        title={t("uploadTitle")}
                      >
                        {isSessionFontLoading ? (
                          <Spinner className="size-3" />
                        ) : (
                          <Upload className="size-3" />
                        )}
                        {t("upload")}
                      </button>
                    )}
                  </div>

                  {cat.key === "custom" && items.length === 0 && (
                    <div className="px-2 py-1.5 text-[11px] text-muted-foreground">
                      {t("emptyHint")}
                    </div>
                  )}

                  {items.map((f) => {
                    const selected = !isMixed && effectiveFontFamily === f.value
                    const userId =
                      cat.key === "custom" && f.value.startsWith("uf:")
                        ? f.value.slice(3)
                        : null
                    return (
                      <button
                        key={f.value}
                        type="button"
                        className={cn(
                          "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                          selected && "bg-accent text-accent-foreground",
                        )}
                        style={{ fontFamily: toCssFontFamily(f.value) }}
                        onClick={() => onPick(f.value)}
                      >
                        <span className="min-w-0 flex-1 truncate">{f.label}</span>
                        {userId && (
                          <span
                            role="button"
                            tabIndex={0}
                            className="rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/15 group-hover:opacity-100"
                            title={t("remove")}
                            onClick={(e) => handleDelete(e, userId, f.value)}
                            onKeyDown={(e: KeyboardEvent) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                void handleDelete(
                                  e as unknown as MouseEvent,
                                  userId,
                                  f.value,
                                )
                              }
                            }}
                          >
                            <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                          </span>
                        )}
                        {selected ? (
                          <Check className="size-3.5 shrink-0 opacity-80" />
                        ) : (
                          <span className="size-3.5 shrink-0" aria-hidden />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {uploadError && (
            <p className="px-2 pb-1 text-[10px] text-destructive">{uploadError}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,font/ttf,font/otf"
            className="hidden"
            onChange={handleUpload}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
