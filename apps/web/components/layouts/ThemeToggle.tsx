"use client"

import { Moon, Sun } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export function ThemeToggle({
  className,
  size = "icon",
}: {
  className?: string
  size?: "icon" | "icon-xs" | "icon-sm"
}) {
  const t = useTranslations("Common")
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn("cursor-pointer", size === "icon" && "size-8", className)}
      aria-label={t("themeToggle")}
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
    >
      <Sun className="hidden dark:block" />
      <Moon className="block dark:hidden" />
    </Button>
  )
}
