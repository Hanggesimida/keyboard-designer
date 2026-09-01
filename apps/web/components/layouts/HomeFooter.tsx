import Link from "next/link"
import type { ComponentType } from "react"
import { Globe, Keyboard, LayoutGrid } from "lucide-react"
import { Logo } from "@/components/layouts/Logo"

/** GitHub Invertocat mark from Simple Icons / Octicons (MIT). */
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

type FooterLink = {
  name: string
  href: string
  icon: ComponentType<{ className?: string }>
  external?: boolean
}

const footerLinks: { title: string; links: FooterLink[] }[] = [
  {
    title: "产品",
    links: [
      { name: "功能特性", href: "#features", icon: LayoutGrid },
      { name: "设计编辑器", href: "/design", icon: Keyboard },
    ],
  },
  {
    title: "关于",
    links: [
      {
        name: "GitHub",
        href: "https://github.com/Hanggesimida/keyboard-designer",
        icon: GitHubIcon,
        external: true,
      },
      {
        name: "作者网站",
        href: "https://www.weihangli.dev/",
        icon: Globe,
        external: true,
      },
    ],
  },
]

const linkClassName =
  "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors duration-150"

export function HomeFooter() {
  return (
    <footer id="about" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-4 md:max-w-xs">
            <Link href="/" aria-label="home" className="inline-flex">
              <Logo />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              在浏览器中设计键盘键帽，所见即所得。完全免费，无需注册。
            </p>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-16">
            {footerLinks.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <span className="text-foreground text-sm font-semibold">
                  {group.title}
                </span>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map((link) => {
                    const content = (
                      <>
                        <link.icon className="size-4 shrink-0" aria-hidden="true" />
                        {link.name}
                      </>
                    )

                    return (
                      <li key={link.name}>
                        {link.external ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={linkClassName}
                          >
                            {content}
                          </a>
                        ) : (
                          <Link href={link.href} className={linkClassName}>
                            {content}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
