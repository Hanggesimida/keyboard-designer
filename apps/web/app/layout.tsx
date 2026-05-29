import "@workspace/ui/globals.css"
import localFont from "next/font/local"
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google"

const inter = localFont({
  src: [
    { path: "../public/fonts/inter/inter-latin-400-normal.woff2",  weight: "400", style: "normal" },
    { path: "../public/fonts/inter/inter-latin-400-italic.woff2",  weight: "400", style: "italic" },
    { path: "../public/fonts/inter/inter-latin-700-normal.woff2",  weight: "700", style: "normal" },
    { path: "../public/fonts/inter/inter-latin-700-italic.woff2",  weight: "700", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
})

const ibmPlexMono = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono/ibm-plex-mono-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/ibm-plex-mono/ibm-plex-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono/ibm-plex-mono-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

const jetBrainsMono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/jetbrains-mono/jetbrains-mono-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/jetbrains-mono/jetbrains-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/jetbrains-mono/jetbrains-mono-latin-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

// CJK 字体使用 next/font/google，Google 会自动按 unicode-range 分块下发，
// 按需加载覆盖 latin + chinese-simplified 全字符集，不受单一分块限制。
// 转曲（JIG 生成）仍使用 public/fonts/noto-*/NotoXxxSC-Regular.ttf。
const notoSansSC = Noto_Sans_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  display: "swap",
  preload: false,
})

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  display: "swap",
  preload: false,
})

const spaceGrotesk = localFont({
  src: [
    { path: "../public/fonts/space-grotesk/space-grotesk-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/space-grotesk/space-grotesk-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
})

const oxanium = localFont({
  src: [
    { path: "../public/fonts/oxanium/oxanium-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/oxanium/oxanium-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-oxanium",
  display: "swap",
})

const orbitron = localFont({
  src: [
    { path: "../public/fonts/obitron/orbitron-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/obitron/orbitron-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-orbitron",
  display: "swap",
})

const dmMono = localFont({
  src: [
    { path: "../public/fonts/dm-mono/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/dm-mono/dm-mono-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
})

const playfairDisplay = localFont({
  src: [
    { path: "../public/fonts/playfair-display/playfair-display-latin-400-normal.woff2", weight: "400" },
    { path: "../public/fonts/playfair-display/playfair-display-latin-700-normal.woff2", weight: "700" },
  ],
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
    ibmPlexMono.variable,
    jetBrainsMono.variable,
    notoSansSC.variable,
    notoSerifSC.variable,
    spaceGrotesk.variable,
    oxanium.variable,
    orbitron.variable,
    dmMono.variable,
    playfairDisplay.variable,
  ].join(" ")

  return (
    <html lang="zh-CN" className={`dark ${fontVariables}`}>
      <body>{children}</body>
    </html>
  )
}
