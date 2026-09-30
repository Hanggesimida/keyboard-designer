import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { hasLocale } from "next-intl"
import { setRequestLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { HomeHeader } from "@/components/layouts/HomeHeader"
import { HomeFooter } from "@/components/layouts/HomeFooter"
import {
  CtaSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  LayoutsSection,
  OpenSourceSection,
  StatsStrip,
  WorkflowSection,
} from "@/modules/home"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return {
    alternates: {
      canonical: locale === "en" ? "/" : `/${locale}`,
      languages: { en: "/", zh: "/zh", "x-default": "/" },
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <div className="theme-workshop min-h-screen overflow-x-clip bg-background text-foreground">
      <HomeHeader />
      <main>
        <HeroSection />
        <StatsStrip />
        <WorkflowSection />
        <FeaturesSection />
        <LayoutsSection />
        <OpenSourceSection />
        <FaqSection />
        <CtaSection />
      </main>
      <HomeFooter />
    </div>
  )
}
