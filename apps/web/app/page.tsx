"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import layout87 from "@/modules/design/data/layouts/ansi-87.json"

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white overflow-hidden" style={{ fontFamily: "var(--font-inter), var(--font-space-grotesk), sans-serif" }}>
      {/* 灵动岛毛玻璃 Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4">
        <nav
          className={`flex items-center gap-6 px-5 h-11 rounded-full border transition-all duration-500 ease-out ${
            scrolled
              ? "border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              : "border-white/8 bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
          }`}
          style={{ backdropFilter: "blur(24px) saturate(1.8)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="#0d0d0d"/>
                <rect x="7" y="1" width="4" height="4" rx="1" fill="#0d0d0d"/>
                <rect x="1" y="7" width="4" height="4" rx="1" fill="#0d0d0d"/>
                <rect x="7" y="7" width="4" height="4" rx="1" fill="#0d0d0d" opacity="0.4"/>
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">Keyboard Designer</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <a href="#features" className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white/90 rounded-full hover:bg-white/[0.06] transition-all duration-200">
              功能
            </a>
            <a href="#about" className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white/90 rounded-full hover:bg-white/[0.06] transition-all duration-200">
              关于
            </a>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* CTA */}
          <Link
            href="/design"
            className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#0d0d0d] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
          >
            开始设计
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main ref={heroRef} className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* 背景光晕 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(ellipse, rgba(120,80,255,0.6) 0%, rgba(60,130,255,0.3) 40%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, rgba(255,100,150,0.5) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
          {/* 细网格背景 */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        {/* 主标题 */}
        <h1 className="relative max-w-3xl text-[clamp(2.5rem,7vw,5rem)] font-bold leading-[1.05] tracking-tight mb-6">
          <span className="text-white">为你的键盘</span>
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            设计专属键帽
          </span>
        </h1>

        {/* 副标题 */}
        <p className="relative max-w-lg text-[clamp(0.95rem,2vw,1.125rem)] text-white/40 leading-relaxed mb-10 font-light">
          直观的键帽编辑器，自定义键帽，所见即所得，可导出为图片或 SVG。
        </p>

        {/* CTA 按钮组 */}
        <div className="relative flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/design"
            className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-[#0d0d0d] text-sm font-semibold hover:bg-white/92 active:scale-[0.97] transition-all duration-200 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          >
            打开设计编辑器
            <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <a
            href="#features"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-white/60 text-sm font-medium hover:bg-white/[0.07] hover:text-white/80 active:scale-[0.97] transition-all duration-200 backdrop-blur-sm"
          >
            了解更多
          </a>
        </div>

        {/* 键盘预览卡片 */}
        <div className="relative mt-20 w-full max-w-2xl">
          <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden p-8 shadow-[0_32px_64px_rgba(0,0,0,0.5)]">

            {/* 模拟键盘 */}
            <KeyboardPreview />

            {/* 底部信息 */}
            <div className="mt-6 flex items-center justify-between opacity-40">
              <span className="text-xs text-white/50 font-mono">TKL · 87 Keys</span>
              <span className="text-xs text-white/50 font-mono">Cherry MX · RGB</span>
            </div>
          </div>

          {/* 卡片发光边框 */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(120,80,255,0.15) 0%, transparent 50%, rgba(60,130,255,0.1) 100%)",
            }}
          />
        </div>

        {/* 滚动提示 */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs text-white/50 font-medium tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-28">
        {/* 背景装饰 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
            style={{
              background: "radial-gradient(ellipse, rgba(60,130,255,0.5) 0%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* 标题 */}
          <div className="text-center mb-16">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-white/30 mb-4">功能特性</p>
            <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight tracking-tight text-white">
              你所需要的一切<br />
              <span style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                尽在其中
              </span>
            </h2>
          </div>

          {/* 主功能卡片 3列 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M2 4h16v2H2V4zM4 9h12v2H4V9zM6 14h8v2H6v-2z" fill="currentColor" opacity="0.9"/>
                </svg>
              }
              color="violet"
              title="多布局支持"
              desc="内置 TKL 87 键等主流布局，轻松切换，完整呈现你的键盘结构。"
            />
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="10" cy="10" r="2.5" fill="currentColor"/>
                </svg>
              }
              color="blue"
              title="精准颜色编辑"
              desc="HSB / HEX / RGB 三种模式随意切换，颜色选取精细到个位像素。"
            />
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              color="emerald"
              title="所见即所得"
              desc="实时预览每一次改动，操作结果即时反馈，无需猜测最终效果。"
            />
          </div>

          {/* 次级功能卡片 2列 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              }
              color="indigo"
              title="多键帽批量编辑"
              desc="框选或点选任意数量的键帽，一次性修改颜色、标签与样式，效率数倍提升。"
              wide
            />
            <FeatureCard
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v11M6 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 16h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              color="cyan"
              title="导出 PNG / SVG"
              desc="一键将设计方案导出为高清 PNG 或矢量 SVG，随时分享或送往厂商打样。"
              wide
            />
          </div>

          {/* 底部宽卡 */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-violet-400">
                <path d="M3 7h16M3 11h10M3 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="17" cy="15" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M17 13.5v1.5l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-white mb-1">开放的 JSON 配置格式</h3>
              <p className="text-sm text-white/40 leading-relaxed">
                设计数据以结构化 JSON 存储，格式清晰可读，支持版本管理与团队协作。每一个键帽的位置、尺寸、颜色与标签均完整记录，方便二次开发或脚本批量生成。
              </p>
            </div>
            <Link
              href="/design"
              className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white/70 text-sm font-medium hover:bg-white/[0.11] hover:text-white transition-all duration-200"
            >
              立即体验 →
            </Link>
          </div>
        </div>
      </section>

      {/* About / Footer */}
      <footer id="about" className="border-t border-white/[0.06] px-6 py-12">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
                <rect x="7" y="1" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
                <rect x="1" y="7" width="4" height="4" rx="1" fill="white" opacity="0.7"/>
                <rect x="7" y="7" width="4" height="4" rx="1" fill="white" opacity="0.2"/>
              </svg>
            </div>
            <span className="text-sm text-white/30 font-medium">Keyboard Designer</span>
          </div>
          <p className="text-xs text-white/20">为每一位键盘爱好者而生 · 开源 · 免费</p>
        </div>
      </footer>
    </div>
  )
}

type FeatureCardProps = {
  icon: React.ReactNode
  color: "violet" | "blue" | "emerald" | "indigo" | "cyan"
  title: string
  desc: string
  wide?: boolean
}

const colorMap: Record<FeatureCardProps["color"], { bg: string; border: string; text: string }> = {
  violet:  { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",  text: "#c084fc" },
  blue:    { bg: "rgba(59,130,246,0.12)",   border: "rgba(59,130,246,0.3)",   text: "#60a5fa" },
  emerald: { bg: "rgba(52,211,153,0.12)",   border: "rgba(52,211,153,0.3)",   text: "#34d399" },
  indigo:  { bg: "rgba(99,102,241,0.12)",   border: "rgba(99,102,241,0.3)",   text: "#818cf8" },
  cyan:    { bg: "rgba(6,182,212,0.12)",    border: "rgba(6,182,212,0.3)",    text: "#22d3ee" },
}

function FeatureCard({ icon, color, title, desc }: FeatureCardProps) {
  const c = colorMap[color]
  return (
    <div className="group rounded-2xl border border-white/8 bg-white/[0.025] p-6 hover:bg-white/[0.04] hover:border-white/12 transition-all duration-300">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
    </div>
  )
}

type LayoutKey = {
  keyId: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

// Aurora 渐变：紫 → 靛蓝 → 蓝 → 青 → 绿，按 x 位置插值
function getAuroraColor(x: number): { bg: string; border: string; glow: string } {
  const MAX_X = 18.25
  const t = Math.min(x / MAX_X, 1)
  const stops: [number, number, number][] = [
    [168, 85,  247],  // violet   t=0
    [99,  102, 241],  // indigo   t=0.25
    [59,  130, 246],  // blue     t=0.5
    [6,   182, 212],  // cyan     t=0.75
    [52,  211, 153],  // emerald  t=1.0
  ]
  const n = stops.length - 1
  const i = Math.min(Math.floor(t * n), n - 1)
  const local = t * n - i
  const a = stops[i]!
  const b = stops[Math.min(i + 1, n)]!
  const r = Math.round(a[0] + (b[0] - a[0]) * local)
  const g = Math.round(a[1] + (b[1] - a[1]) * local)
  const bl = Math.round(a[2] + (b[2] - a[2]) * local)
  return {
    bg:     `rgba(${r},${g},${bl},0.18)`,
    border: `rgba(${r},${g},${bl},0.45)`,
    glow:   `rgba(${r},${g},${bl},0.6)`,
  }
}

function KeyboardPreview() {
  const BASE = 30  // px per unit
  const GAP = 3    // px gap between keys
  const TOTAL_W = 18.25 * BASE
  const TOTAL_H = 6.25  * BASE

  const allKeys: LayoutKey[] = layout87.rows.flatMap((row) => row.keys as LayoutKey[])

  return (
    <div
      className="relative select-none mx-auto"
      style={{ width: TOTAL_W, height: TOTAL_H }}
    >
      {allKeys.map((key) => {
        const { bg, border, glow } = getAuroraColor(key.x)
        const left   = key.x * BASE + GAP / 2
        const top    = key.y * BASE + GAP / 2
        const width  = key.w * BASE - GAP
        const height = key.h * BASE - GAP
        const fontSize = key.label.length > 4 ? 6 : key.label.length > 2 ? 7.5 : 9

        return (
          <div
            key={key.keyId}
            className="absolute flex items-center justify-center rounded font-medium text-white/70 transition-all duration-150 hover:brightness-125 hover:scale-[1.06] cursor-default"
            style={{
              left, top, width, height,
              background: bg,
              border: `1px solid ${border}`,
              fontSize,
              boxShadow: `0 0 6px ${glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
            }}
          >
            {key.label}
          </div>
        )
      })}
    </div>
  )
}
