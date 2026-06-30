'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Variants } from 'motion/react'
import { Button } from '@workspace/ui/components/button'
import { AnimatedGroup } from '@/components/ui/animated-group'

const transitionVariants: { item: Variants } = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
}

export function CtaSection() {
  return (
    <section className="relative overflow-hidden py-24">

      <div className="mx-auto max-w-5xl px-6 text-center">
        <AnimatedGroup variants={transitionVariants}>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase mb-4">
            立即开始
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-balance mb-6">
            开始设计你的专属键帽
          </h2>
          <p className="text-muted-foreground text-lg text-balance max-w-xl mx-auto mb-10">
            免费使用，无需注册。打开编辑器，选好布局，调出你的专属配色，几分钟内完成设计。
          </p>
        </AnimatedGroup>

        <AnimatedGroup
          variants={{
            container: {
              visible: {
                transition: {
                  staggerChildren: 0.05,
                  delayChildren: 0.4,
                },
              },
            },
            ...transitionVariants,
          }}
          className="flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <div className="bg-foreground/10 rounded-[14px] border p-0.5">
            <Button asChild size="lg" className="rounded-xl px-6 text-base">
              <Link href="/design">
                <span className="text-nowrap">打开设计编辑器</span>
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <Button asChild size="lg" variant="ghost" className="h-10.5 rounded-xl px-6">
            <Link href="#features">
              <span className="text-nowrap">查看功能介绍</span>
            </Link>
          </Button>
        </AnimatedGroup>
      </div>
    </section>
  )
}
