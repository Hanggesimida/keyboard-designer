'use client'

import { Download, Layout, Palette, Sparkles, Play } from 'lucide-react'
import { Card } from '@workspace/ui/components/card'

export function FeaturesSection() {
  return (
    <section id="features">
      <div className="py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* 大卡：所见即所得编辑器 */}
            <Card className="col-span-full overflow-hidden pl-6 pt-6 gap-0">
              <Layout className="text-primary size-5" />
              <h3 className="mt-5 text-lg font-semibold">所见即所得编辑器</h3>
              <p className="text-muted-foreground mt-3 max-w-xl text-balance">
                直观的键帽编辑界面，实时预览每一个键帽的颜色、文字与图标，拖拽排布，设计结果即时呈现。
              </p>
              <div className="[mask-image:linear-gradient(to_bottom,transparent_0%,black_5%,black_95%,transparent_100%)] -ml-2 -mt-2 mr-0.5 pl-2 pt-2">
                <div className="bg-background rounded-tl-xl relative mx-auto mt-8 h-96 overflow-hidden border border-transparent shadow ring-1 ring-foreground/5">
                  <img
                    src="/images/hero_light.png"
                    alt="键帽设计编辑器界面"
                    width="2700"
                    height="1440"
                    className="object-top h-full w-full object-cover dark:hidden"
                  />
                  <img
                    src="/images/hero_dark.png"
                    alt="键帽设计编辑器界面"
                    width="2700"
                    height="1440"
                    className="object-top hidden h-full w-full object-cover dark:block"
                  />
                </div>
              </div>
            </Card>

            {/* 中卡：丰富色彩系统 */}
            <Card className="overflow-hidden p-6 gap-0">
              <Palette className="text-primary size-5" />
              <h3 className="mt-5 text-lg font-semibold">丰富色彩系统</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                支持自定义颜色与渐变，完整色盘覆盖机械键盘主流配色方案。
              </p>
              <ColorPaletteIllustration />
            </Card>

            {/* 中卡：导出 SVG / 图片 */}
            <Card className="group overflow-hidden px-6 pt-6 gap-0">
              <Download className="text-primary size-5" />
              <h3 className="mt-5 text-lg font-semibold">导出 SVG / 图片</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                一键导出为 SVG 矢量图或高清 PNG，随时用于设计稿分享或打印预览。
              </p>
              <ExportIllustration />
            </Card>

            {/* 中卡：智能布局适配 */}
            <Card className="group overflow-hidden px-6 pt-6 gap-0">
              <Sparkles className="text-primary size-5" />
              <h3 className="mt-5 text-lg font-semibold">智能布局适配</h3>
              <p className="text-muted-foreground mt-3 text-balance">
                自动识别 60%、75%、TKL 等主流键盘布局，键位一键对齐排列。
              </p>
              <LayoutIllustration />
            </Card>
          </div>
        </div>
      </div>
    </section>
  )
}

const ColorPaletteIllustration = () => {
  const colors = [
    ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'],
    ['#fde68a', '#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    ['#a5f3fc', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490'],
    ['#bbf7d0', '#4ade80', '#22c55e', '#16a34a', '#15803d'],
    ['#fecdd3', '#fb7185', '#f43f5e', '#e11d48', '#be123c'],
  ]

  return (
    <div aria-hidden className="mt-9 space-y-1.5">
      {colors.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-1.5">
          {row.map((color, colIdx) => (
            <div
              key={colIdx}
              className="h-8 flex-1 rounded-md transition-transform duration-200 hover:scale-105"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

const ExportIllustration = () => {
  return (
    <div aria-hidden className="relative mt-7">
      <Card className="aspect-video w-4/5 translate-y-4 p-4 transition-transform duration-200 ease-in-out group-hover:-rotate-3 gap-0">
        <div className="mb-3 flex items-center gap-2">
          <div className="bg-primary/10 flex size-6 items-center justify-center rounded-md">
            <Download className="text-primary size-3.5" />
          </div>
          <span className="text-muted-foreground text-sm font-medium">导出文件</span>
        </div>
        <div className="ml-8 space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-foreground/10 h-2 flex-1 rounded-full" />
            <span className="text-muted-foreground text-xs">SVG</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-foreground/10 h-2 w-3/5 rounded-full" />
            <span className="text-muted-foreground text-xs">PNG</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-foreground/10 h-2 w-1/2 rounded-full" />
            <span className="text-muted-foreground text-xs">JSON</span>
          </div>
        </div>
      </Card>
      <Card className="aspect-square absolute -top-4 right-0 flex w-2/5 translate-y-4 p-2 transition-transform duration-200 ease-in-out group-hover:rotate-3 gap-0">
        <div className="bg-foreground/5 m-auto flex size-10 rounded-full">
          <Play className="fill-foreground/50 stroke-foreground/50 m-auto size-4" />
        </div>
      </Card>
    </div>
  )
}

const LayoutIllustration = () => {
  const layouts = [
    { label: '100%', keys: 12, active: false },
    { label: 'TKL', keys: 10, active: false },
    { label: '75%', keys: 8, active: true },
    { label: '65%', keys: 7, active: false },
    { label: '60%', keys: 6, active: false },
  ]

  return (
    <Card
      aria-hidden
      className="mt-6 translate-y-2 p-4 pb-6 transition-transform duration-200 group-hover:translate-y-0 gap-0"
    >
      <p className="text-muted-foreground mb-3 text-xs">选择键盘布局</p>
      <div className="space-y-2">
        {layouts.map((layout) => (
          <div
            key={layout.label}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              layout.active ? 'bg-primary/10' : 'hover:bg-muted/50'
            }`}
          >
            <span
              className={`text-sm font-medium w-10 ${
                layout.active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {layout.label}
            </span>
            <div className="flex gap-0.5">
              {Array.from({ length: layout.keys }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-sm ${
                    layout.active ? 'bg-primary/40' : 'bg-foreground/10'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
