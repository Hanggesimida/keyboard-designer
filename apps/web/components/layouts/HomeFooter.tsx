import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Logo } from "@/components/layouts/Logo"
import { GitHubIcon } from "@/components/layouts/GitHubIcon"
import { siteConfig } from "@/lib/site"

type FooterLink = {
  name: string
  href: string
  external?: boolean
}

const linkClassName =
  "text-muted-foreground hover:text-foreground text-sm transition-colors duration-150"

export function HomeFooter() {
  const t = useTranslations("Home.footer")

  const footerLinks: { title: string; links: FooterLink[] }[] = [
    {
      title: t("product"),
      links: [
        { name: t("editor"), href: "/design" },
        { name: t("features"), href: "/#features" },
        { name: t("layouts"), href: "/#layouts" },
        { name: t("assets"), href: "/assets" },
      ],
    },
    {
      title: t("openSource"),
      links: [
        { name: "GitHub", href: siteConfig.githubRepo, external: true },
        { name: t("issues"), href: siteConfig.githubIssues, external: true },
        { name: t("license"), href: siteConfig.license, external: true },
      ],
    },
    {
      title: t("about"),
      links: [
        { name: t("authorSite"), href: siteConfig.authorSite, external: true },
      ],
    },
  ]

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-4">
            <Link href="/" className="inline-flex w-fit">
              <Logo />
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("blurb")}
            </p>
            <a
              href={siteConfig.githubRepo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <GitHubIcon className="size-4" />
              {t("star")}
            </a>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-16">
            {footerLinks.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <span className="text-sm font-semibold text-foreground">
                  {group.title}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => (
                    <li key={link.name}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClassName}
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link href={link.href} className={linkClassName}>
                          {link.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <p className="font-code">{t("madeWith")}</p>
        </div>
      </div>
    </footer>
  )
}
