"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { LogoIcon } from "@/components/layouts/Logo"

import {
  changeInitialPassword,
  setPasswordSchema,
  type SetPasswordInput,
} from "@/lib/api/auth"
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

export function ChangePasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const setToken = useUserStore((s) => s.setToken)

  const [changePasswordToken, setChangePasswordToken] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("change_password_token")
    if (!token) {
      router.replace("/login")
      return
    }
    setChangePasswordToken(token)
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
      const res = await changeInitialPassword(data.password, changePasswordToken)
      getQueryClient().clear()
      setToken(res.accessToken)
      sessionStorage.removeItem("change_password_token")
      sessionStorage.removeItem("otp_email")
      router.push(redirect)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "设置密码失败，请重试"
      setServerError(msg)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <LogoIcon className="size-6" />
          </div>
          <span className="sr-only">烬炆外设</span>
        </Link>
        <h1 className="text-xl font-bold">设置您的登录密码</h1>
        <FieldDescription>
          为保障账号安全，请设置您自己的登录密码（初始密码仅展示一次）
        </FieldDescription>
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">新密码</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="至少 8 位"
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
            <FieldLabel htmlFor="confirm">确认密码</FieldLabel>
            <div className="relative">
              <Input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="再次输入密码"
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
              disabled={isSubmitting || !changePasswordToken}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  设置中…
                </>
              ) : (
                "确认并继续"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
