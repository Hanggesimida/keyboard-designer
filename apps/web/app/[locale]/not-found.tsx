import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { HomeHeader } from "@/components/layouts/HomeHeader"
import { HomeFooter } from "@/components/layouts/HomeFooter"
import { keycapButtonClass } from "@/modules/home/components/primitives"

export default async function NotFoundPage() {
  const t = await getTranslations("NotFoundPage")
  const tCommon = await getTranslations("Common")

  return (
    <div className="theme-workshop flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      <HomeHeader />
      <main className="flex flex-1 flex-col items-center justify-center bg-dot-grid px-6 pt-28 pb-20 text-center">
        <div aria-hidden className="flex gap-2">
          {["4", "0", "4"].map((digit, index) => (
            <span
              key={index}
              className="keycap flex size-16 items-center justify-center rounded-xl border bg-card font-code text-2xl font-semibold md:size-20 md:text-3xl"
            >
              {digit}
            </span>
          ))}
        </div>
        <h1 className="mt-10 text-4xl font-bold tracking-tight text-balance md:text-5xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-balance text-muted-foreground">
          {t("description")}
        </p>
        <Link href="/" className={keycapButtonClass("primary", "mt-8")}>
          {tCommon("backHome")}
        </Link>
      </main>
      <HomeFooter />
    </div>
  )
}
