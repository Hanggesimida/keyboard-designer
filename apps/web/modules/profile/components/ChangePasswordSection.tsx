"use client"

import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  changePassword,
  createChangePasswordSchema,
  createChangePasswordWithCurrentSchema,
  type ChangePasswordInput,
  type ChangePasswordWithCurrentInput,
} from "@/lib/api/auth"
import { resolveErrorMessage } from "@/lib/api/request"
import { useUserStore } from "@/store/userStore"
import { getQueryClient } from "@/lib/api/queryClient"
import { userKeys } from "@/hooks/queries/users/useUsers"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { ProfileSection } from "@/modules/profile"

interface ChangePasswordSectionProps {
  hasPassword: boolean
  forceChange?: boolean
}

export function ChangePasswordSection({
  hasPassword,
  forceChange = false,
}: ChangePasswordSectionProps) {
  const t = useTranslations("Profile.password")
  const tAuth = useTranslations("Auth")
  const tValidation = useTranslations("Validation")
  const tErrors = useTranslations("Errors")
  const accessToken = useUserStore((s) => s.accessToken)
  const setToken = useUserStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const schemaWithCurrent = useMemo(
    () => createChangePasswordWithCurrentSchema(tValidation),
    [tValidation],
  )
  const schemaWithoutCurrent = useMemo(
    () => createChangePasswordSchema(tValidation),
    [tValidation],
  )

  const formWithCurrent = useForm<ChangePasswordWithCurrentInput>({
    resolver: zodResolver(schemaWithCurrent),
  })

  const formWithoutCurrent = useForm<ChangePasswordInput>({
    resolver: zodResolver(schemaWithoutCurrent),
  })

  const isSubmitting = hasPassword
    ? formWithCurrent.formState.isSubmitting
    : formWithoutCurrent.formState.isSubmitting

  const onSubmitWithCurrent = async (data: ChangePasswordWithCurrentInput) => {
    if (!accessToken) return
    setServerError(null)
    setSuccess(false)
    try {
      const res = await changePassword(
        { currentPassword: data.currentPassword, newPassword: data.password },
        accessToken,
      )
      getQueryClient().clear()
      setToken(res.accessToken)
      getQueryClient().invalidateQueries({ queryKey: userKeys.me })
      formWithCurrent.reset()
      setSuccess(true)
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("changeFailed"), tErrors("sessionExpired")))
    }
  }

  const onSubmitWithoutCurrent = async (data: ChangePasswordInput) => {
    if (!accessToken) return
    setServerError(null)
    setSuccess(false)
    try {
      const res = await changePassword({ newPassword: data.password }, accessToken)
      getQueryClient().clear()
      setToken(res.accessToken)
      getQueryClient().invalidateQueries({ queryKey: userKeys.me })
      formWithoutCurrent.reset()
      setSuccess(true)
    } catch (err: unknown) {
      setServerError(resolveErrorMessage(err, t("setFailed"), tErrors("sessionExpired")))
    }
  }

  return (
    <ProfileSection title={hasPassword ? t("changeTitle") : t("setTitle")}>
      {forceChange && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          {t("forceHint")}
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        {hasPassword ? (
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">{t("current")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder={t("current")}
                    aria-invalid={!!formWithCurrent.formState.errors.currentPassword}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...formWithCurrent.register("currentPassword")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCurrent((v) => !v)}
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError
                  errors={[formWithCurrent.formState.errors.currentPassword]}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">{t("new")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={tAuth("passwordPlaceholder")}
                    aria-invalid={!!formWithCurrent.formState.errors.password}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...formWithCurrent.register("password")}
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
                <FieldError errors={[formWithCurrent.formState.errors.password]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm">{t("confirm")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={tAuth("confirmPlaceholder")}
                    aria-invalid={!!formWithCurrent.formState.errors.confirm}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...formWithCurrent.register("confirm")}
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
                <FieldError errors={[formWithCurrent.formState.errors.confirm]} />
              </Field>

              {serverError && <FieldError>{serverError}</FieldError>}
              {success && (
                <FieldDescription className="text-emerald-600 dark:text-emerald-400">
                  {t("updated")}
                </FieldDescription>
              )}

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer"
                  onClick={formWithCurrent.handleSubmit(onSubmitWithCurrent)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin opacity-70" />
                      {t("saving")}
                    </>
                  ) : (
                    t("saveNew")
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        ) : (
          <form>
            <FieldGroup>
              <FieldDescription className="mb-2">
                {t("otpHint")}
              </FieldDescription>

              <Field>
                <FieldLabel htmlFor="new-password">{t("new")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={tAuth("passwordPlaceholder")}
                    aria-invalid={!!formWithoutCurrent.formState.errors.password}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...formWithoutCurrent.register("password")}
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
                <FieldError
                  errors={[formWithoutCurrent.formState.errors.password]}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="new-confirm">{t("confirm")}</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={tAuth("confirmPlaceholder")}
                    aria-invalid={!!formWithoutCurrent.formState.errors.confirm}
                    disabled={isSubmitting}
                    className="pr-10"
                    {...formWithoutCurrent.register("confirm")}
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
                <FieldError
                  errors={[formWithoutCurrent.formState.errors.confirm]}
                />
              </Field>

              {serverError && <FieldError>{serverError}</FieldError>}
              {success && (
                <FieldDescription className="text-emerald-600 dark:text-emerald-400">
                  {t("set")}
                </FieldDescription>
              )}

              <Field>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer"
                  onClick={formWithoutCurrent.handleSubmit(onSubmitWithoutCurrent)}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin opacity-70" />
                      {t("saving")}
                    </>
                  ) : (
                    t("setPassword")
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        )}
      </div>
    </ProfileSection>
  )
}
