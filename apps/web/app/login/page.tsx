import { Suspense } from "react"
import Link from "next/link"
import { Home } from "lucide-react"
import { LoginForm } from "@/modules/auth/login-form"
import { Spinner } from "@workspace/ui/components/spinner"
import { Button } from "@workspace/ui/components/button"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <Button variant="outline" size="xs" asChild className="absolute top-4 left-4 md:top-6 md:left-6">
        <Link href="/">
          <Home size={15} />
          返回首页
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
