"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"

import { login, loginSchema, type LoginInput } from "@/lib/api/auth"
import { useUserStore } from "@/store/userStore"
import { getQueryClient } from "@/lib/api/queryClient"
import { TurnstileWidget } from "@/components/turnstile/TurnstileWidget"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field"

import { WechatAuthButton } from "./wechat-auth-button"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/design"
  const reason = searchParams.get("reason")
  const setToken = useUserStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const [failCount, setFailCount] = useState(0)
  const [turnstileToken, setTurnstileToken] = useState<string>("")

  const requireTurnstile = failCount >= 3

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    try {
      const res = await login({
        ...data,
        ...(requireTurnstile ? { turnstileToken } : {}),
      })
      getQueryClient().clear()
      setToken(res.accessToken)
      router.push(redirect)
    } catch {
      const next = failCount + 1
      setFailCount(next)
      if (next >= 3) {
        setTurnstileToken("")
        setServerError("连续登录失败，请完成人机验证后重试")
      } else {
        setServerError(`邮箱或密码错误，请重试（还剩 ${3 - next} 次免验证机会）`)
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link
              href="/"
              className="flex flex-col items-center gap-2 font-medium"
            >
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">烬炆外设</span>
            </Link>
            <h1 className="text-xl font-bold">欢迎回来</h1>
            <FieldDescription>
              还没有账号？ <Link href="/register">立即注册</Link>
            </FieldDescription>
          </div>

          {reason === "expired" && (
            <FieldDescription className="text-center rounded-lg border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-amber-600 dark:text-amber-400">
              登录已过期，请重新登录后继续
            </FieldDescription>
          )}

          <Field>
            <FieldLabel htmlFor="email">邮箱</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              disabled={isSubmitting}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="password">密码</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          {serverError && <FieldError>{serverError}</FieldError>}

          {requireTurnstile && (
            <TurnstileWidget
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
            />
          )}

          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || (requireTurnstile && !turnstileToken)}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  登录中…
                </>
              ) : (
                "登录"
              )}
            </Button>
          </Field>

          <FieldSeparator>或</FieldSeparator>

          <WechatAuthButton action="登录" />
        </FieldGroup>
      </form>

      <FieldDescription className="px-6 text-center">
        点击继续即表示您同意我们的{" "}
        <a href="#">服务条款</a>
        {" "}和{" "}
        <a href="#">隐私政策</a>。
      </FieldDescription>
    </div>
  )
}
