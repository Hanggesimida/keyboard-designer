import { Keyboard } from "lucide-react"
import { HomeHeader } from "@/components/layouts/HomeHeader"
import { HeroSection } from "@/components/blocks/hero-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <HomeHeader />
      <HeroSection />

      <footer id="about" className="border-t border-border px-4 sm:px-6 py-10 sm:py-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center">
              <Keyboard className="text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">Keyboard Designer</span>
          </div>
          <p className="text-xs text-muted-foreground/70">为键盘定制DIY而生</p>
          <a
            href="https://weihangli.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/80 hover:text-foreground transition-colors duration-200"
          >
            by weihangli.dev
          </a>
        </div>
      </footer>
    </div>
  )
}
