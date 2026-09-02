'use client'

import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

const FAQ_IDS = ['0', '1', '2', '3', '4'] as const

export function FaqSection() {
  const t = useTranslations('Home.faq')

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-5 md:gap-12">
          <div className="md:col-span-2">
            <h2 className="text-foreground text-4xl font-semibold">{t('title')}</h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              {t('subtitle')}
            </p>
          </div>

          <div className="md:col-span-3">
            <Accordion type="single" collapsible>
              {FAQ_IDS.map((id) => (
                <AccordionItem key={id} value={`item-${id}`}>
                  <AccordionTrigger className="cursor-pointer text-base hover:no-underline">
                    {t(`items.${id}.q`)}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base">{t(`items.${id}.a`)}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  )
}
