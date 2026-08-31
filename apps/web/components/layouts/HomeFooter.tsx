import Link from "next/link"
import { Logo } from "@/components/layouts/Logo"

type FooterLink = {
  name: string
  href: string
}

const footerLinks: { title: string; links: FooterLink[] }[] = [
  {
    title: "产品",
    links: [
      { name: "功能特性", href: "#features" },
      { name: "设计编辑器", href: "/design" },
    ],
  },
]

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
                  {group.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-150"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
