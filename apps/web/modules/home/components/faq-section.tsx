'use client'

import Link from 'next/link'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@workspace/ui/components/accordion'

const faqItems = [
  {
    id: 'item-1',
    question: '使用键帽设计器需要付费吗？',
    answer:
      '完全免费。你可以直接打开设计编辑器，无需注册即可开始设计键帽配色与布局。',
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
      '我们的后台支持导出 SVG 矢量图和高清 PNG 图片，方便用于设计稿分享、打印预览或交给生产厂商。',
  },
  {
    id: 'item-4',
    question: '设计稿可以保存吗？',
    answer:
      '注册账号后，你的设计会自动保存到云端，随时可以在不同设备上继续编辑。未登录状态下，设计仅保存在当前浏览器会话中。',
  },
  {
    id: 'item-5',
    question: '导出的设计可以用于量产吗？',
    answer:
      '可以。导出的 SVG 文件包含完整的键帽颜色与标注信息，可直接提供给键帽定制厂商作为生产参考。',
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
              关于键帽设计器的常见疑问
            </p>
            <p className="text-muted-foreground mt-6 hidden md:block">
              没有找到答案？欢迎访问{' '}
              <Link
                href="https://weihangli.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline"
              >
                作者主页
              </Link>
              {' '}了解更多。
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

          <p className="text-muted-foreground mt-6 md:hidden">
            没有找到答案？欢迎访问{' '}
            <Link
              href="https://weihangli.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              作者主页
            </Link>
            {' '}了解更多。
          </p>
        </div>
      </div>
    </section>
  )
}
