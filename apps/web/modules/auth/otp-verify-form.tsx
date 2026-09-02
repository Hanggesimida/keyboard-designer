"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { LogoIcon } from "@/components/layouts/Logo"
import { Link, useRouter } from "@/i18n/navigation"

import { verifyOtp, createVerifyOtpSchema, type VerifyOtpInput } from "@/lib/api/auth"
import { resolveErrorMessage } from "@/lib/api/request"
import { useUserStore } from "@/store/userStore"
import { getQueryClient } from "@/lib/api/queryClient"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

export function OtpVerifyForm() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const setToken = useUserStore((s) => s.setToken)

  const [email, setEmail] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)

  const verifyOtpSchema = useMemo(() => createVerifyOtpSchema(tValidation), [tValidation])

  useEffect(() => {
    const stored = sessionStorage.getItem("otp_email")
    if (!stored) {
      router.replace("/login")
      return
    }
    setEmail(stored)
  }, [router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
  })

  const onSubmit = async (data: VerifyOtpInput) => {
    setServerError(null)
    try {
      const res = await verifyOtp(email, data.otp)

      if (res.action === "logged_in") {
        getQueryClient().clear()
        setToken(res.accessToken)
        sessionStorage.removeItem("otp_email")
        router.push(redirect)
      } else if (res.action === "change_password") {
        sessionStorage.setItem("change_password_token", res.changePasswordToken)
        router.push(`/login/change-password?redirect=${encodeURIComponent(redirect)}`)
      } else {
        sessionStorage.setItem("otp_setup_token", res.setupToken)
        router.push(`/login/set-password?redirect=${encodeURIComponent(redirect)}`)
      }
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("verifyFailed"), tErrors("sessionExpired")))
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
        <h1 className="text-xl font-bold">{t("enterCode")}</h1>
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

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  {t("verifying")}
                </>
              ) : (
                t("verifyAndSignIn")
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
              {t("backToResend")}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
