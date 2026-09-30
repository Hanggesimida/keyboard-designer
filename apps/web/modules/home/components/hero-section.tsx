import { useTranslations } from "next-intl"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { GitHubIcon } from "@/components/layouts/GitHubIcon"
import { siteConfig } from "@/lib/site"
import { Container, keycapButtonClass } from "./primitives"
import { HeroKeyboard } from "./hero-keyboard"

export function HeroSection() {
  const t = useTranslations("Home.hero")

  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
      <div
        aria-hidden
        className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]"
      />
      <Container className="relative">
        <div className="mx-auto max-w-3xl animate-in text-center duration-500 fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
          <a
            href={siteConfig.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border bg-card/70 py-1 pr-3 pl-1.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <span className="rounded-full bg-primary px-2 py-0.5 font-code text-[11px] font-medium text-primary-foreground">
              MIT
            </span>
            <GitHubIcon className="size-3.5" />
            {t("badge")}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>

          <h1 className="mt-7 text-[2.5rem] leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-[4.25rem]">
            {t.rich("title", {
              em: (chunks) => <span className="text-brand">{chunks}</span>,
              br: () => <br />,
            })}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-balance text-muted-foreground md:text-lg">
            {t("subtitle")}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/design" className={keycapButtonClass("brand")}>
              {t("start")}
              <ArrowRight aria-hidden />
            </Link>
            <a
              href={siteConfig.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className={keycapButtonClass("secondary")}
            >
              <GitHubIcon />
              {t("github")}
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground md:hidden">
            {t("desktopNote")}
          </p>
        </div>

        <HeroKeyboard className="mt-14 animate-in delay-150 duration-700 fill-mode-both fade-in slide-in-from-bottom-4 motion-reduce:animate-none md:mt-20" />
      </Container>
    </section>
  )
}
