import "@workspace/ui/globals.css"
import {
  Inter,
  Roboto,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Noto_Sans_SC,
  Noto_Serif_SC,
  Space_Grotesk,
  Oxanium,
  Orbitron,
  Fira_Code,
  DM_Mono,
  Playfair_Display,
} from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const notoSansSC = Noto_Sans_SC({
  weight: ["400", "700"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
})

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "700"],
  variable: "--font-noto-serif-sc",
  display: "swap",
  preload: false,
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-oxanium",
  display: "swap",
})

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
})

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const fontVariables = [
    inter.variable,
    roboto.variable,
    ibmPlexMono.variable,
    jetBrainsMono.variable,
    notoSansSC.variable,
    notoSerifSC.variable,
    spaceGrotesk.variable,
    oxanium.variable,
    orbitron.variable,
    firaCode.variable,
    dmMono.variable,
    playfairDisplay.variable,
  ].join(" ")

  return (
    <html lang="zh-CN" className={`dark ${fontVariables}`}>
      <body>{children}</body>
    </html>
  )
}
