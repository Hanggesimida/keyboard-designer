import { useTranslations } from "next-intl"
import { cn } from "@workspace/ui/lib/utils"
import { Section, SectionHeading } from "./primitives"

const STATS = [
  { id: "layouts", value: "9" },
  { id: "exports", value: "5" },
  { id: "preview", value: "3D" },
  { id: "backend", value: "0" },
] as const

const STEPS = ["layout", "design", "preview", "export"] as const

export function StatsStrip() {
  const t = useTranslations("Home.stats")

  return (
    <div className="border-y">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {STATS.map((stat, index) => (
          <div
            key={stat.id}
            className={cn(
              "flex flex-col gap-1 px-6 py-7 md:py-9",
              index % 2 === 1 && "border-l",
              index >= 2 && "border-t md:border-t-0",
              index === 2 && "md:border-l"
            )}
          >
            <dt className="order-2 text-sm text-muted-foreground">
              {t(stat.id)}
            </dt>
            <dd className="order-1 font-code text-3xl font-semibold tracking-tight md:text-4xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function WorkflowSection() {
  const t = useTranslations("Home.workflow")

  return (
    <Section id="how-it-works">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="relative mt-14">
        <div
          aria-hidden
          className="absolute top-11 right-[12%] left-[12%] hidden h-px bg-border lg:block"
        />
        <ol className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step} className="relative rounded-2xl border bg-card p-6">
              <span
                aria-hidden
                className="keycap flex size-10 items-center justify-center rounded-lg bg-primary font-code text-sm font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold">
                {t(`steps.${step}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${step}.body`)}
              </p>
              <p className="mt-5 font-code text-xs text-muted-foreground/80">
                {t(`steps.${step}.meta`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  )
}
