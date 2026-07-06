'use client'

import { Keyboard } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
} from '@workspace/ui/components/card'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'

const testimonials = [
  {
    featured: true,
    quote:
      '键帽设计器彻底改变了我的定制流程。以前要在 Photoshop 里一个个键帽画，现在拖拽调色、实时预览，十分钟就能出一套完整配色方案。完成后下单直接交给厂商，省时又省心。',
    name: '张明',
    role: '机械键盘爱好者',
    initials: 'ZM',
  },
  {
    featured: false,
    wide: true,
    quote:
      '界面直观、上手极快，不用学复杂软件就能做出专业级配色，非常方便简单！',
    name: '李雅',
    role: '客制化玩家',
    initials: 'LY',
  },
  {
    featured: false,
    quote:
      '终于有一个专门为键帽设计做的工具了，支持多种布局切换，太方便了！',
    name: '王浩',
    role: '键盘社区博主',
    initials: 'WH',
  },
  {
    featured: false,
    quote:
      '从灵感到成品只用了一下午，配色方案和导出质量都很满意，强烈推荐。',
    name: '陈思',
    role: 'UI 设计师',
    initials: 'CS',
  },
] as const

function TestimonialAuthor({
  name,
  role,
  initials,
}: {
  name: string
  role: string
  initials: string
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-3">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <cite className="text-sm font-medium not-italic">{name}</cite>
        <span className="text-muted-foreground block text-sm">{role}</span>
      </div>
    </div>
  )
}

export function TestimonialsSection() {
  const [featured, wide, ...rest] = testimonials

  return (
    <section id="testimonials" className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl space-y-8 px-6 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
          <h2 className="text-4xl font-medium lg:text-5xl">
            为定制玩家而生，深受键盘爱好者喜爱
          </h2>
          <p className="text-muted-foreground text-balance">
            从配色灵感、布局适配到导出生产，帮助机械键盘玩家在浏览器中完成整套键帽设计。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-2">
          <Card className="grid grid-rows-[auto_1fr] gap-8 sm:col-span-2 sm:p-6 lg:row-span-2">
            <CardHeader>
              <Keyboard className="text-primary size-6" aria-hidden />
            </CardHeader>
            <CardContent>
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">{featured.quote}</p>
                <TestimonialAuthor {...featured} />
              </blockquote>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="h-full pt-6">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">{wide.quote}</p>
                <TestimonialAuthor {...wide} />
              </blockquote>
            </CardContent>
          </Card>

          {rest.map((item) => (
            <Card key={item.name}>
              <CardContent className="h-full pt-6">
                <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                  <p>{item.quote}</p>
                  <TestimonialAuthor {...item} />
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
