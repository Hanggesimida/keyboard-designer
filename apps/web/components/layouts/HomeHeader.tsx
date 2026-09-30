"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowRight, Menu, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Link } from "@/i18n/navigation"
import { Logo } from "@/components/layouts/Logo"
import { ThemeToggle } from "@/components/layouts/ThemeToggle"
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher"
import { GitHubIcon } from "@/components/layouts/GitHubIcon"
import { siteConfig } from "@/lib/site"

export function HomeHeader() {
  const t = useTranslations("Nav")
  const tCommon = useTranslations("Common")
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const menuItems = [
    { name: t("features"), href: "/#features" },
    { name: t("layouts"), href: "/#layouts" },
    { name: t("openSource"), href: "/#open-source" },
    { name: t("faq"), href: "/#faq" },
    { name: t("assets"), href: "/assets" },
  ]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const githubLink = (
    <a
      href={siteConfig.githubRepo}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="GitHub"
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <GitHubIcon className="size-4" />
    </a>
  )

  return (
    <header className="fixed inset-x-0 top-0 z-30 px-3 pt-3">
      <nav
        className={cn(
          "mx-auto max-w-6xl rounded-2xl border border-transparent transition-[background-color,border-color,box-shadow] duration-300",
          (scrolled || menuOpen) &&
            "border-border bg-background/90 shadow-[0_8px_30px_-12px_rgb(0_0_0/0.18)] backdrop-blur-xl"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-4 px-4 md:px-5">
          <Link href="/" aria-label={tCommon("backHome")} className="shrink-0">
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1">
            <div className="hidden items-center gap-1 sm:flex">
              {githubLink}
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            <Link
              href="/design"
              className="keycap ml-2 hidden h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 sm:inline-flex"
            >
              {t("start")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg hover:bg-muted lg:hidden"
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t px-4 pt-3 pb-4 lg:hidden">
            <ul className="flex flex-col">
              {menuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-3 sm:hidden">
              <div className="flex items-center gap-1">
                {githubLink}
                <LocaleSwitcher />
                <ThemeToggle />
              </div>
              <Link
                href="/design"
                className="keycap inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-semibold text-brand-foreground"
              >
                {t("start")}
              </Link>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  )
}
