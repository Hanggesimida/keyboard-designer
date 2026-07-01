import { HomeHeader } from "@/components/layouts/HomeHeader"
import { HomeFooter } from "@/components/layouts/HomeFooter"
import { HeroSection, FeaturesSection, FaqSection, CtaSection } from "@/modules/home"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <HomeHeader />
      <HeroSection />
      <FeaturesSection />
      <FaqSection />
      <CtaSection />
      <HomeFooter />
    </div>
  )
}
