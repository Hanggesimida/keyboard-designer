"use client"

import { useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { LogoIcon } from "@/components/layouts/Logo"
import { Link, useRouter } from "@/i18n/navigation"

import {
  forgotPassword,
  createForgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/api/auth"
import { resolveErrorMessage } from "@/lib/api/request"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

export function ForgotPasswordForm() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const forgotPasswordSchema = useMemo(
    () => createForgotPasswordSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordInput) => {
    setServerError(null)
    try {
      await forgotPassword(data.email)
      sessionStorage.setItem("reset_password_email", data.email)
      setSent(true)
      router.push(
        `/login/reset-password?redirect=${encodeURIComponent(redirect)}`,
      )
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("sendFailed"), tErrors("sessionExpired")))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <LogoIcon className="size-6" />
          </div>
          <span className="sr-only">{tCommon("appName")}</span>
        </Link>
        <h1 className="text-xl font-bold">{t("forgotTitle")}</h1>
        <FieldDescription>
          {t("forgotSubtitle")}
        </FieldDescription>
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              disabled={isSubmitting || sent}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || sent}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  {t("sending")}
                </>
              ) : sent ? (
                t("sentRedirecting")
              ) : (
                t("sendCode")
              )}
            </Button>
          </Field>

          <Field>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/login")}
            >
              <ArrowLeft size={15} />
              {t("backToSignIn")}
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {sent && getValues("email") && (
        <FieldDescription className="text-center">
          {t("codeSentIfRegistered", { email: getValues("email") })}
        </FieldDescription>
      )}
    </div>
  )
}
