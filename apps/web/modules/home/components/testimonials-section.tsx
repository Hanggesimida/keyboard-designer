'use client'

import { Keyboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardHeader,
} from '@workspace/ui/components/card'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'

const TESTIMONIALS = [
  { id: '0', featured: true, wide: false, initials: 'ZM' },
  { id: '1', featured: false, wide: true, initials: 'LY' },
  { id: '2', featured: false, wide: false, initials: 'WH' },
  { id: '3', featured: false, wide: false, initials: 'SC' },
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
  const t = useTranslations('Home.testimonials')
  const featured = TESTIMONIALS[0]
  const wide = TESTIMONIALS[1]
  const rest = TESTIMONIALS.slice(2)

  return (
    <section id="testimonials" className="py-16 md:py-32">
      <div className="mx-auto max-w-6xl space-y-8 px-6 md:space-y-16">
        <div className="relative z-10 mx-auto max-w-xl space-y-6 text-center md:space-y-12">
          <h2 className="text-4xl font-medium lg:text-5xl">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-balance">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-rows-2">
          <Card className="grid grid-rows-[auto_1fr] gap-8 sm:col-span-2 sm:p-6 lg:row-span-2">
            <CardHeader>
              <Keyboard className="text-primary size-6" aria-hidden />
            </CardHeader>
            <CardContent>
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">{t(`items.${featured.id}.quote`)}</p>
                <TestimonialAuthor
                  name={t(`items.${featured.id}.name`)}
                  role={t(`items.${featured.id}.role`)}
                  initials={featured.initials}
                />
              </blockquote>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="h-full pt-6">
              <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                <p className="text-xl font-medium">{t(`items.${wide.id}.quote`)}</p>
                <TestimonialAuthor
                  name={t(`items.${wide.id}.name`)}
                  role={t(`items.${wide.id}.role`)}
                  initials={wide.initials}
                />
              </blockquote>
            </CardContent>
          </Card>

          {rest.map((item) => (
            <Card key={item.id}>
              <CardContent className="h-full pt-6">
                <blockquote className="grid h-full grid-rows-[1fr_auto] gap-6">
                  <p>{t(`items.${item.id}.quote`)}</p>
                  <TestimonialAuthor
                    name={t(`items.${item.id}.name`)}
                    role={t(`items.${item.id}.role`)}
                    initials={item.initials}
                  />
                </blockquote>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
