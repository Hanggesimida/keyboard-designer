import { Suspense } from "react"
import { ForgotPasswordForm } from "@/modules/auth/forgot-password-form"
import { Spinner } from "@workspace/ui/components/spinner"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
