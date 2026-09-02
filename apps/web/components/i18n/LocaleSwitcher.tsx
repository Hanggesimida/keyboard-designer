"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

const LOCALE_LABELS: Record<(typeof routing.locales)[number], string> = {
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
