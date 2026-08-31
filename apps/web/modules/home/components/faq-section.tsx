'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

const faqItems = [
  {
    id: 'item-1',
    question: '使用键盘设计器需要付费吗？',
    answer:
      '本网站完全免费，不收取任何费用。无需注册，所有功能均可直接使用。',
  },
  {
    id: 'item-2',
    question: '支持哪些键盘布局？',
    answer:
      '目前支持 60%、75%、TKL 等主流机械键盘布局。编辑器会自动对齐键位，你也可以在布局之间切换。',
  },
  {
    id: 'item-3',
    question: '可以导出什么格式？',
    answer:
      '支持导出 SVG 矢量图和高清 PNG 图片，方便用于设计稿分享或打印预览。',
  },
  {
    id: 'item-4',
    question: '设计稿可以保存吗？',
    answer:
      '设计保存在当前浏览器会话中。刷新或关闭页面会丢失未导出的修改，请及时导出 JSON 备份。无需注册，也不收取任何费用。',
  },
  {
    id: 'item-5',
    question: '导出的设计可以用于制作吗？',
    answer:
      '可以。导出的 SVG 文件包含完整的键帽颜色与标注信息，可作为后续制作参考。',
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-5 md:gap-12">
          <div className="md:col-span-2">
            <h2 className="text-foreground text-4xl font-semibold">常见问题</h2>
            <p className="text-muted-foreground mt-4 text-balance text-lg">
              关于键盘设计器的常见疑问
            </p>
          </div>

          <div className="md:col-span-3">
            <Accordion type="single" collapsible>
              {faqItems.map((item) => (
                <AccordionItem key={item.id} value={item.id}>
                  <AccordionTrigger className="cursor-pointer text-base hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-base">{item.answer}</p>
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
