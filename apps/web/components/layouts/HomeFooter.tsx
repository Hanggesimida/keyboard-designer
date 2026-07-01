import Link from "next/link"
import { Logo } from "@/components/layouts/Logo"

type FooterLink = {
  name: string
  href: string
  external?: boolean
}

const footerLinks: { title: string; links: FooterLink[] }[] = [
  {
    title: "产品",
    links: [
      { name: "功能特性", href: "#features" },
      { name: "设计编辑器", href: "/design" },
    ],
  },
  {
    title: "关于",
    links: [
      { name: "作者主页", href: "https://weihangli.dev", external: true },
    ],
  },
]

export function HomeFooter() {
  return (
    <footer id="about" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          {/* 品牌区 */}
          <div className="flex flex-col gap-4 md:max-w-xs">
            <Link href="/" aria-label="home" className="inline-flex">
              <Logo />
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              为键盘定制 DIY 而生。直观的键帽编辑器，所见即所得。
            </p>
          </div>

          {/* 导航链接组 */}
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
                        {...(link.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
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

        {/* 底部版权栏 */}
        <div className="border-t border-border/60 mt-10 pt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/70 hover:text-foreground text-xs transition-colors duration-150"
          >
            粤ICP备2026084978号
          </a>
          <p className="text-muted-foreground/70 text-xs">
            Built by{" "}
            <a
              href="https://weihangli.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors duration-150"
            >
              weihangli.dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
