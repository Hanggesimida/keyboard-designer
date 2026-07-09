"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { LogoIcon } from "@/components/layouts/Logo"

import {
  forgotPassword,
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/api/auth"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

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
      const msg = err instanceof Error ? err.message : "发送失败，请稍后重试"
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
        <h1 className="text-xl font-bold">忘记密码</h1>
        <FieldDescription>
          输入注册邮箱，我们将发送验证码用于重置密码
        </FieldDescription>
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">邮箱</FieldLabel>
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
                  发送中…
                </>
              ) : sent ? (
                "已发送，正在跳转…"
              ) : (
                "发送验证码"
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
              返回登录
            </Button>
          </Field>
        </FieldGroup>
      </form>

      {sent && getValues("email") && (
        <FieldDescription className="text-center">
          若邮箱已注册，验证码已发送至 {getValues("email")}
        </FieldDescription>
      )}
    </div>
  )
}
