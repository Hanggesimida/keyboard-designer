import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDot,
  Scale,
  Server,
} from "lucide-react"
import { Link } from "@/i18n/navigation"
import { GitHubIcon } from "@/components/layouts/GitHubIcon"
import { siteConfig } from "@/lib/site"
import { keycapButtonClass, Section, SectionHeading } from "./primitives"

const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "Tailwind CSS 4",
  "Three.js",
  "Zustand",
  "opentype.js",
]

export function OpenSourceSection() {
  const t = useTranslations("Home.openSource")

  return (
    <Section id="open-source">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            description={t("description")}
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={siteConfig.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className={keycapButtonClass("primary")}
            >
              <GitHubIcon />
              {t("star")}
            </a>
            <Link href="/assets" className={keycapButtonClass("secondary")}>
              {t("assetsCta")}
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <OpenSourceCard
            icon={<Scale />}
            title={t("license.title")}
            body={t("license.body")}
          >
            <ExternalLink href={siteConfig.license}>
              {t("license.link")}
            </ExternalLink>
          </OpenSourceCard>

          <OpenSourceCard
            icon={<Server />}
            title={t("stack.title")}
            body={t("stack.body")}
          >
            <ul className="flex flex-wrap gap-1.5">
              {TECH_STACK.map((item) => (
                <li
                  key={item}
                  className="rounded-md bg-muted px-2 py-1 font-code text-[11px] text-muted-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </OpenSourceCard>

          <OpenSourceCard
            icon={<Boxes />}
            title={t("assets.title")}
            body={t("assets.body")}
          >
            <Link
              href="/assets"
              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-brand"
            >
              {t("assets.link")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </OpenSourceCard>

          <OpenSourceCard
            icon={<CircleDot />}
            title={t("contribute.title")}
            body={t("contribute.body")}
          >
            <ExternalLink href={siteConfig.githubIssues}>
              {t("contribute.link")}
            </ExternalLink>
          </OpenSourceCard>
        </div>
      </div>
    </Section>
  )
}

function OpenSourceCard({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode
  title: string
  body: string
  children: ReactNode
}) {
  return (
    <article className="flex flex-col rounded-2xl border bg-card p-6">
      <span className="text-foreground [&_svg]:size-5">{icon}</span>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className="mt-auto pt-5">{children}</div>
    </article>
  )
}

function ExternalLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-semibold text-foreground transition-colors hover:text-brand"
    >
      {children}
      <ArrowUpRight className="size-3.5" aria-hidden />
    </a>
  )
}
