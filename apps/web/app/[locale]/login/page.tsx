import type { Metadata } from "next"
import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Home } from "lucide-react"
import { LoginForm } from "@/modules/auth/login-form"
import { Spinner } from "@workspace/ui/components/spinner"
import { Button } from "@workspace/ui/components/button"
import { Link } from "@/i18n/navigation"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata")
  return { title: t("loginTitle") }
}

export default async function LoginPage() {
  const t = await getTranslations("Common")
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <Button variant="outline" size="xs" asChild className="absolute top-4 left-4 md:top-6 md:left-6">
        <Link href="/">
          <Home size={15} />
          {t("backHome")}
        </Link>
      </Button>
      <div className="w-full max-w-sm">
        <Suspense fallback={<div className="flex justify-center py-20"><Spinner className="size-6 text-muted-foreground" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
