import type { CSSProperties, ReactNode } from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import {
  Box,
  Download,
  History,
  Images,
  MousePointer2,
  Paintbrush,
  SquareDashedMousePointer,
  Type,
} from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Section, SectionHeading } from "./primitives"

export function FeaturesSection() {
  const t = useTranslations("Home.features")
  const locale = useLocale()

  return (
    <Section id="features">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <FeatureCard
          className="md:col-span-2 lg:col-span-4"
          icon={<Box />}
          title={t("preview3d.title")}
          body={t("preview3d.body")}
          media
        >
          <ProductCrop
            image="hero"
            locale={locale}
            alt={t("preview3d.alt")}
            className="aspect-[12/5]"
            imageStyle={{ width: "140%", left: "-20%", top: 0 }}
          />
        </FeatureCard>

        <FeatureCard
          className="lg:col-span-2"
          icon={<Download />}
          title={t("export.title")}
          body={t("export.body")}
        >
          <ExportVisual />
        </FeatureCard>

        <FeatureCard
          className="lg:col-span-2"
          icon={<Paintbrush />}
          title={t("keycap.title")}
          body={t("keycap.body")}
        >
          <KeycapStylesVisual />
        </FeatureCard>

        <FeatureCard
          className="lg:col-span-2"
          icon={<SquareDashedMousePointer />}
          title={t("batch.title")}
          body={t("batch.body")}
        >
          <BatchVisual />
        </FeatureCard>

        <FeatureCard
          className="lg:col-span-2"
          icon={<Type />}
          title={t("fonts.title")}
          body={t("fonts.body")}
        >
          <FontsVisual uploadLabel={t("fonts.upload")} />
        </FeatureCard>

        <FeatureCard
          className="md:col-span-2 lg:col-span-2"
          icon={<History />}
          title={t("history.title")}
          body={t("history.body")}
        >
          <HistoryVisual
            undoLabel={t("history.undo")}
            redoLabel={t("history.redo")}
          />
        </FeatureCard>

        <FeatureCard
          className="md:col-span-2 lg:col-span-4"
          icon={<Images />}
          title={t("artwork.title")}
          body={t("artwork.body")}
          media
        >
          <ProductCrop
            image="feature"
            locale={locale}
            alt={t("artwork.alt")}
            className="aspect-[12/5]"
            imageStyle={{ width: "160%", left: "-28%", top: "-4%" }}
          />
        </FeatureCard>
      </div>
    </Section>
  )
}

function FeatureCard({
  icon,
  title,
  body,
  media = false,
  className,
  children,
}: {
  icon: ReactNode
  title: string
  body: string
  media?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card p-6",
        className
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand/12 text-brand [&_svg]:size-[18px]">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <div className={cn("mt-auto pt-7", media && "-mx-6 -mb-6")}>
        {children}
      </div>
    </article>
  )
}

function ProductCrop({
  image,
  locale,
  alt,
  className,
  imageStyle,
}: {
  image: "hero" | "feature"
  locale: string
  alt: string
  className?: string
  imageStyle: CSSProperties
}) {
  return (
    <div
      className={cn("relative overflow-hidden border-t bg-muted", className)}
    >
      {(["light", "dark"] as const).map((theme) => (
        <Image
          key={theme}
          src={`/images/${image}_${theme}_${locale}.png`}
          alt={theme === "light" ? alt : ""}
          aria-hidden={theme === "dark" || undefined}
          width={2700}
          height={1440}
          sizes="(min-width: 1024px) 1200px, 160vw"
          className={cn(
            "absolute h-auto max-w-none",
            theme === "light" ? "dark:hidden" : "hidden dark:block"
          )}
          style={imageStyle}
        />
      ))}
    </div>
  )
}

/** 与设计器一致：整颗键帽一个颜色（由 className/style 给出），投影只落在键帽外。 */
function MiniKeycap({
  className,
  style,
  children,
}: {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <span
      className={cn(
        "flex size-12 items-center justify-center rounded-[6px] text-sm font-semibold shadow-[0_1.5px_0_rgb(0_0_0/0.18),0_4px_8px_-4px_rgb(0_0_0/0.3)]",
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}

function KeycapStylesVisual() {
  return (
    <div aria-hidden className="flex flex-wrap gap-2.5">
      <MiniKeycap
        className="text-white"
        style={{ backgroundImage: "linear-gradient(135deg, #f08a4b, #f3c24f)" }}
      >
        A
      </MiniKeycap>
      <MiniKeycap
        className="bg-[#343b58] text-[11px] text-[#e9e7de]"
        style={{ fontFamily: "var(--font-orbitron)" }}
      >
        ESC
      </MiniKeycap>
      <MiniKeycap
        className="bg-[#f6f4ec] text-lg text-[#2a2f45]"
        style={{ fontFamily: "var(--font-playfair-display)" }}
      >
        Ag
      </MiniKeycap>
      <MiniKeycap className="bg-[#bfd6ee] text-[#1f2a44] outline-2 -outline-offset-2 outline-brand">
        ⌘
      </MiniKeycap>
      <MiniKeycap
        className="bg-[#e6a0af] text-base text-white"
        style={{ fontFamily: "var(--font-noto-serif-sc)" }}
      >
        字
      </MiniKeycap>
    </div>
  )
}

function BatchVisual() {
  const selected = new Set([1, 2, 3, 7, 8, 9])
  return (
    <div aria-hidden className="relative w-fit">
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 18 }, (_, index) => (
          <MiniKeycap
            key={index}
            className={cn(
              "size-8 rounded-[5px]",
              selected.has(index) ? "bg-brand" : "bg-[#ecebe2]"
            )}
          />
        ))}
      </div>
      <span className="absolute top-[-4px] left-[34px] h-[78px] w-[118px] rounded-lg border-2 border-dashed border-brand bg-brand/10" />
      <MousePointer2 className="absolute top-[64px] left-[140px] size-5 fill-foreground text-foreground" />
    </div>
  )
}

function FontsVisual({ uploadLabel }: { uploadLabel: string }) {
  const samples = [
    { name: "Orbitron", family: "var(--font-orbitron)" },
    { name: "Playfair", family: "var(--font-playfair-display)" },
    { name: "Space Grotesk", family: "var(--font-space-grotesk)" },
  ]
  return (
    <div aria-hidden className="space-y-2">
      {samples.map((sample) => (
        <div
          key={sample.name}
          className="flex items-center justify-between rounded-lg border bg-background/60 px-3 py-2"
        >
          <span className="text-xl" style={{ fontFamily: sample.family }}>
            Aa Qq 12
          </span>
          <span className="font-code text-[11px] text-muted-foreground">
            {sample.name}
          </span>
        </div>
      ))}
      <div className="rounded-lg border border-dashed px-3 py-2 text-center font-code text-xs text-muted-foreground">
        + {uploadLabel}
      </div>
    </div>
  )
}

function ExportVisual() {
  const files = [
    { name: "keyboard.png", tag: "PNG" },
    { name: "keyboard.svg", tag: "SVG" },
    { name: "design.json", tag: "JSON" },
    { name: "jig.svg", tag: "JIG" },
    { name: "preview-3d.png", tag: "3D" },
  ]
  return (
    <ul aria-hidden className="space-y-1.5">
      {files.map((file, index) => (
        <li
          key={file.name}
          className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2"
        >
          <span
            className={cn(
              "w-11 rounded px-1.5 py-0.5 text-center font-code text-[10px] font-semibold",
              index === 3
                ? "bg-brand text-brand-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {file.tag}
          </span>
          <span className="font-code text-sm">{file.name}</span>
        </li>
      ))}
    </ul>
  )
}

function HistoryVisual({
  undoLabel,
  redoLabel,
}: {
  undoLabel: string
  redoLabel: string
}) {
  const rows = [
    { key: "Z", label: undoLabel },
    { key: "Y", label: redoLabel },
  ]
  return (
    <div aria-hidden className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <kbd className="kbd-key">Ctrl</kbd>
          <span className="text-sm text-muted-foreground">+</span>
          <kbd className="kbd-key">{row.key}</kbd>
          <span className="ml-2 text-sm text-muted-foreground">
            {row.label}
          </span>
        </div>
      ))}
    </div>
  )
}
