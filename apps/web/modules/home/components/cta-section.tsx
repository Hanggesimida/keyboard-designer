'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight } from 'lucide-react'
import type { Variants } from 'motion/react'
import { buttonVariants } from '@workspace/ui/components/button'
import { AnimatedGroup } from '@/components/animate/animated-group'

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
  const t = useTranslations('Home.cta')

  return (
    <section className="relative overflow-hidden py-24">

      <div className="mx-auto max-w-5xl px-6 text-center">
        <AnimatedGroup variants={transitionVariants}>
          <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase mb-4">
            {t('eyebrow')}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-balance mb-6">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-lg text-balance max-w-xl mx-auto mb-10">
            {t('body')}
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
            <Link
              href="/design"
              className={buttonVariants({ size: "lg", className: "rounded-xl px-6 text-base" })}
            >
              <span className="text-nowrap">{t('openEditor')}</span>
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
          <Link
            href="#features"
            className={buttonVariants({
              size: "lg",
              variant: "ghost",
              className: "h-10.5 rounded-xl px-6",
            })}
          >
            <span className="text-nowrap">{t('viewFeatures')}</span>
          </Link>
        </AnimatedGroup>
      </div>
    </section>
  )
}
