"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { LogoIcon } from "@/components/layouts/Logo"
import { Link, useRouter } from "@/i18n/navigation"

import {
  resetPassword,
  createResetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/api/auth"
import { resolveErrorMessage } from "@/lib/api/request"
import { useUserStore } from "@/store/userStore"
import { getQueryClient } from "@/lib/api/queryClient"
import { useSessionStorageItem } from "@/hooks/useSessionStorageItem"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

export function ResetPasswordForm() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const setToken = useUserStore((s) => s.setToken)

  const email = useSessionStorageItem("reset_password_email")
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const resetPasswordSchema = useMemo(
    () => createResetPasswordSchema(tValidation),
    [tValidation],
  )

  useEffect(() => {
    if (!sessionStorage.getItem("reset_password_email")) {
      router.replace("/login/forgot-password")
    }
  }, [router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordInput) => {
    setServerError(null)
    try {
      const res = await resetPassword(email, data.otp, data.password)
      getQueryClient().clear()
      setToken(res.accessToken)
      sessionStorage.removeItem("reset_password_email")
      router.push(redirect)
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("resetFailed"), tErrors("sessionExpired")))
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
        <h1 className="text-xl font-bold">{t("resetPassword")}</h1>
        {email && (
          <FieldDescription>
            {t("codeSentTo")} <span className="text-foreground font-medium">{email}</span>
          </FieldDescription>
        )}
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="otp">{t("sixDigitCode")}</FieldLabel>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              maxLength={6}
              className="tracking-widest text-center text-lg"
              aria-invalid={!!errors.otp}
              disabled={isSubmitting}
              {...register("otp")}
            />
            <FieldDescription>{t("codeExpires")}</FieldDescription>
            <FieldError errors={[errors.otp]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">{t("newPassword")}</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("passwordPlaceholder")}
                aria-invalid={!!errors.password}
                disabled={isSubmitting}
                className="pr-10"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError errors={[errors.password]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="confirm">{t("confirmPassword")}</FieldLabel>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder={t("confirmPlaceholder")}
                aria-invalid={!!errors.confirm}
                disabled={isSubmitting}
                className="pr-10"
                {...register("confirm")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <FieldError errors={[errors.confirm]} />
          </Field>

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !email}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  {t("resetting")}
                </>
              ) : (
                t("confirmReset")
              )}
            </Button>
          </Field>

          <Field>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => router.push("/login/forgot-password")}
            >
              <ArrowLeft size={15} />
              {t("backToResend")}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
