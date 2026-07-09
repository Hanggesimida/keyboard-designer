"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import {
  changePassword,
  changePasswordSchema,
  changePasswordWithCurrentSchema,
  type ChangePasswordInput,
  type ChangePasswordWithCurrentInput,
} from "@/lib/api/auth"
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
  const accessToken = useUserStore((s) => s.accessToken)
  const setToken = useUserStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const formWithCurrent = useForm<ChangePasswordWithCurrentInput>({
    resolver: zodResolver(changePasswordWithCurrentSchema),
  })

  const formWithoutCurrent = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
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
      setServerError(err instanceof Error ? err.message : "修改失败，请重试")
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
      setServerError(err instanceof Error ? err.message : "设置失败，请重试")
    }
  }

  return (
    <ProfileSection title={hasPassword ? "修改密码" : "设置密码"}>
      {forceChange && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-sm text-amber-600 dark:text-amber-400">
          您的密码已被重置，请先设置新密码后再继续使用。
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/40 p-4">
        {hasPassword ? (
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">当前密码</FieldLabel>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="请输入当前密码"
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
                <FieldLabel htmlFor="password">新密码</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="至少 8 位"
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
                <FieldLabel htmlFor="confirm">确认新密码</FieldLabel>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="再次输入新密码"
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
                  密码已更新
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
                      保存中…
                    </>
                  ) : (
                    "保存新密码"
                  )}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        ) : (
          <form>
            <FieldGroup>
              <FieldDescription className="mb-2">
                您当前使用验证码登录，设置密码后可直接用密码登录。
              </FieldDescription>

              <Field>
                <FieldLabel htmlFor="new-password">新密码</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="至少 8 位"
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
                <FieldLabel htmlFor="new-confirm">确认密码</FieldLabel>
                <div className="relative">
                  <Input
                    id="new-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="再次输入密码"
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
                  密码已设置
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
                      保存中…
                    </>
                  ) : (
                    "设置密码"
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
