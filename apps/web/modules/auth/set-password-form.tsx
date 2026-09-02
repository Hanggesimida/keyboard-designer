"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import { LogoIcon } from "@/components/layouts/Logo"
import { Link, useRouter } from "@/i18n/navigation"

import { setPassword, createSetPasswordSchema, type SetPasswordInput } from "@/lib/api/auth"
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

export function SetPasswordForm() {
  const t = useTranslations("Auth")
  const tCommon = useTranslations("Common")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const setToken = useUserStore((s) => s.setToken)

  const [setupToken, setSetupToken] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const setPasswordSchema = useMemo(
    () => createSetPasswordSchema(tValidation),
    [tValidation],
  )

  useEffect(() => {
    const token = sessionStorage.getItem("otp_setup_token")
    if (!token) {
      router.replace("/login")
      return
    }
    setSetupToken(token)
  }, [router])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
  })

  const onSubmit = async (data: SetPasswordInput) => {
    setServerError(null)
    try {
      const res = await setPassword(data.password, setupToken)
      getQueryClient().clear()
      setToken(res.accessToken)
      sessionStorage.removeItem("otp_setup_token")
      sessionStorage.removeItem("otp_email")
      router.push(redirect)
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("setPasswordFailed"), tErrors("sessionExpired")))
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
        <h1 className="text-xl font-bold">{t("setPasswordTitle")}</h1>
        <FieldDescription>
          {t("setPasswordSubtitle")}
        </FieldDescription>
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
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
              disabled={isSubmitting || !setupToken}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  {t("setting")}
                </>
              ) : (
                t("finishRegister")
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
