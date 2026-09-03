"use client"

import { useLocale, useTranslations } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

type Locale = (typeof routing.locales)[number]

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {routing.locales.map((nextLocale) => {
        const isActive = locale === nextLocale
        return (
          <Button
            key={nextLocale}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-xs font-medium",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) router.replace(pathname, { locale: nextLocale })
            }}
          >
            {LOCALE_LABELS[nextLocale]}
          </Button>
        )
      })}
    </div>
  )
}

/** 紧凑的单按钮语言切换，按钮文字表示点击后切换到的语言 */
export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale() as Locale
  const t = useTranslations("Common")
  const router = useRouter()
  const pathname = usePathname()
  const nextLocale: Locale = locale === "zh" ? "en" : "zh"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn("cursor-pointer text-[10px] font-semibold", className)}
      title={`${t("switchLanguage")}: ${LOCALE_LABELS[nextLocale]}`}
      aria-label={`${t("switchLanguage")}: ${LOCALE_LABELS[nextLocale]}`}
      onClick={() => router.replace(pathname, { locale: nextLocale })}
    >
      {nextLocale === "zh" ? "中" : "EN"}
    </Button>
  )
}
