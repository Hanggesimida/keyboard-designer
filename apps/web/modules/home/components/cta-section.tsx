import { useTranslations } from "next-intl"
import { ArrowRight, Monitor } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getLayoutData } from "@/modules/design/data/layouts"
import { DEFAULT_COLORWAY, getLayoutKeys } from "../keyboard"
import { KeyboardSvg } from "./keyboard-svg"
import { Container, Eyebrow, keycapButtonClass } from "./primitives"

const CTA_KEYS = getLayoutKeys(getLayoutData("ansi-60"))

export function CtaSection() {
  const t = useTranslations("Home.cta")

  return (
    <section className="py-20 md:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-[#1b1f2e] px-6 py-14 text-[#ecebe2] md:px-14 md:py-16 dark:bg-[#171a24] dark:ring-1 dark:ring-white/10">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(rgb(236_235_226/0.08)_1px,transparent_1px)] [background-size:22px_22px]"
          />
          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Eyebrow>{t("eyebrow")}</Eyebrow>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance md:text-[2.625rem] md:leading-[1.15]">
                {t("title")}
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-[#ecebe2]/70">
                {t("body")}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/design" className={keycapButtonClass("brand")}>
                  {t("start")}
                  <ArrowRight aria-hidden />
                </Link>
                <span className="inline-flex items-center gap-2 text-sm text-[#ecebe2]/60">
                  <Monitor className="size-4" aria-hidden />
                  {t("desktopNote")}
                </span>
              </div>
            </div>
            <div aria-hidden className="hidden lg:block">
              <KeyboardSvg
                keys={CTA_KEYS}
                colorway={DEFAULT_COLORWAY}
                label=""
                className="rotate-[-4deg] drop-shadow-[0_30px_40px_rgb(0_0_0/0.5)]"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
