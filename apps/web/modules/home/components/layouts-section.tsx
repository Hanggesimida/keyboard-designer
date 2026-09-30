import { useTranslations } from "next-intl"
import { ArrowRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getLayoutData } from "@/modules/design/data/layouts"
import { DEFAULT_COLORWAY, getLayoutKeys } from "../keyboard"
import { KeyboardSvg } from "./keyboard-svg"
import { LayoutTabs } from "./layout-tabs"
import { Section, SectionHeading } from "./primitives"

const LAYOUT_IDS = [
  "ansi-60",
  "ansi-65",
  "ansi-75",
  "ansi-75-84",
  "ansi-tkl",
  "ansi-1800",
  "ansi-104",
  "ansi-108",
  "ansi-108-kit",
] as const

export function LayoutsSection() {
  const t = useTranslations("Home.layouts")
  const tLayouts = useTranslations("Design.layouts")

  const layouts = LAYOUT_IDS.map((id) => ({
    id,
    label: tLayouts(id),
    keys: getLayoutKeys(getLayoutData(id)),
  }))

  return (
    <Section id="layouts" className="border-y bg-card/50">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <Link
          href="/design"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-brand"
        >
          {t("cta")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-12">
        <LayoutTabs
          ariaLabel={t("tabsLabel")}
          tabs={layouts.map(({ id, label, keys }) => ({
            id,
            label: label.replace(/[（(]\d+[)）]$/, "").trim(),
            keyCount: keys.length,
          }))}
          panels={layouts.map((layout) => (
            <div
              key={layout.id}
              className="flex min-h-[18rem] items-center justify-center rounded-2xl border bg-background bg-dot-grid p-6 md:p-10"
            >
              <KeyboardSvg
                keys={layout.keys}
                colorway={DEFAULT_COLORWAY}
                label={layout.label}
                showLegends={layout.keys.length <= 108}
                className="mx-auto max-h-[26rem] w-auto max-w-full drop-shadow-[0_18px_24px_rgb(27_31_46/0.18)]"
              />
            </div>
          ))}
        />
      </div>
    </Section>
  )
}
