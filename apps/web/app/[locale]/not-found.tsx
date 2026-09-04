import { Link } from "@/i18n/navigation"
import { getTranslations } from "next-intl/server"
import { buttonVariants } from "@workspace/ui/components/button"
import { HomeHeader } from "@/components/layouts/HomeHeader"
import { HomeFooter } from "@/components/layouts/HomeFooter"

export default async function NotFoundPage() {
  const t = await getTranslations("NotFoundPage")
  const tCommon = await getTranslations("Common")

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col overflow-hidden">
      <HomeHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-[0.3em]">
          404
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-md text-balance text-lg">
          {t("description")}
        </p>
        <Link
          href="/"
          className={buttonVariants({
            size: "lg",
            className: "mt-8 rounded-xl px-5 text-base",
          })}
        >
          {tCommon("backHome")}
        </Link>
      </main>
      <HomeFooter />
    </div>
  )
}
