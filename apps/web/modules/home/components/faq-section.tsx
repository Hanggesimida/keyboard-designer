import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"
import { Section, SectionHeading } from "./primitives"

const FAQ_IDS = [
  "price",
  "layouts",
  "exports",
  "storage",
  "production",
  "preview3d",
  "mobile",
  "assets",
] as const

export function FaqSection() {
  const t = useTranslations("Home.faq")

  return (
    <Section id="faq">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <div className="divide-y border-y">
          {FAQ_IDS.map((id) => (
            <details key={id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-semibold transition-colors hover:text-brand [&::-webkit-details-marker]:hidden">
                {t(`items.${id}.q`)}
                <Plus
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                />
              </summary>
              <p className="-mt-1 pr-10 pb-5 leading-relaxed text-muted-foreground">
                {t(`items.${id}.a`)}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  )
}
