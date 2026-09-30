import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function Container({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-6", className)}>
      {children}
    </div>
  )
}

export function Section({
  id,
  className,
  children,
}: {
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 md:py-28", className)}>
      <Container>{children}</Container>
    </section>
  )
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 font-code text-xs font-medium tracking-[0.18em] text-brand uppercase",
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-[2px] bg-brand" />
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  align?: "left" | "center"
  className?: string
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance md:text-[2.625rem] md:leading-[1.15]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-relaxed text-balance text-muted-foreground md:text-lg">
          {description}
        </p>
      ) : null}
    </div>
  )
}

type KeycapButtonVariant = "primary" | "brand" | "secondary"

const KEYCAP_BUTTON_VARIANTS: Record<KeycapButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  brand: "bg-brand text-brand-foreground hover:bg-brand/90",
  secondary: "bg-card text-foreground border border-border hover:bg-muted",
}

export function keycapButtonClass(
  variant: KeycapButtonVariant = "primary",
  className?: string
) {
  return cn(
    "keycap inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-[0.9375rem] font-semibold whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4 [&_svg]:shrink-0",
    KEYCAP_BUTTON_VARIANTS[variant],
    className
  )
}
