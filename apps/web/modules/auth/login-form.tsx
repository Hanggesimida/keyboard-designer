"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { LogoIcon } from "@/components/layouts/Logo"

import {
  login,
  sendOtp,
  loginSchema,
  sendOtpSchema,
  isChangePasswordResponse,
  type LoginInput,
  type SendOtpInput,
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
  FieldSeparator,
} from "@workspace/ui/components/field"

import { WechatAuthButton } from "./wechat-auth-button"

type Tab = "password" | "otp"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const reason = searchParams.get("reason")
  const setToken = useUserStore((s) => s.setToken)

  const [tab, setTab] = useState<Tab>("password")
  const [serverError, setServerError] = useState<string | null>(null)

  // 密码登录状态
  const [failCount, setFailCount] = useState(0)

  // 验证码发送状态
  const [countdown, setCountdown] = useState(0)
  const [otpSent, setOtpSent] = useState(false)

  // ── 密码登录表单 ─────────────────────────────────────────────
  const passwordForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onPasswordSubmit = async (data: LoginInput) => {
    setServerError(null)
    try {
      const res = await login(data)
      if (isChangePasswordResponse(res)) {
        sessionStorage.setItem("change_password_token", res.changePasswordToken)
        router.push(`/login/change-password?redirect=${encodeURIComponent(redirect)}`)
        return
      }
      getQueryClient().clear()
      setToken(res.accessToken)
      router.push(redirect)
    } catch {
      const next = failCount + 1
      setFailCount(next)
      if (next >= 3) {
        setServerError("连续登录失败，请稍后重试")
      } else {
        setServerError(`邮箱或密码错误（还剩 ${3 - next} 次机会）`)
      }
    }
  }

  // ── 验证码登录表单 ───────────────────────────────────────────
  const otpForm = useForm<SendOtpInput>({
    resolver: zodResolver(sendOtpSchema),
  })

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const onSendOtp = async (data: SendOtpInput) => {
    setServerError(null)
    try {
      await sendOtp(data.email)
      sessionStorage.setItem("otp_email", data.email)
      setOtpSent(true)
      startCountdown()
      router.push(`/login/verify?redirect=${encodeURIComponent(redirect)}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "发送失败，请稍后重试"
      setServerError(msg)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setServerError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 头部 Logo + 标题 */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Link href="/" className="flex flex-col items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md">
            <LogoIcon className="size-6" />
          </div>
          <span className="sr-only">键盘设计器</span>
        </Link>
        <h1 className="text-xl font-bold">欢迎回来</h1>
        <FieldDescription>
          没有账号？验证码登录即可自动注册
        </FieldDescription>
      </div>

      {reason === "expired" && (
        <FieldDescription className="text-center rounded-lg border border-amber-500/20 bg-amber-500/8 px-3.5 py-2.5 text-amber-600 dark:text-amber-400">
          登录已过期，请重新登录后继续
        </FieldDescription>
      )}

      {/* Tab 切换 */}
      <div className="flex rounded-lg border border-border p-0.5 text-sm">
        <button
          type="button"
          onClick={() => switchTab("password")}
          className={cn(
            "flex-1 rounded-md py-1.5 font-medium transition-colors",
            tab === "password"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          密码登录
        </button>
        <button
          type="button"
          onClick={() => switchTab("otp")}
          className={cn(
            "flex-1 rounded-md py-1.5 font-medium transition-colors",
            tab === "otp"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          验证码登录
        </button>
      </div>

      {/* ── 密码登录 ───────────────────────────────────────────── */}
      {tab === "password" && (
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!passwordForm.formState.errors.email}
                disabled={passwordForm.formState.isSubmitting}
                {...passwordForm.register("email")}
              />
              <FieldError errors={[passwordForm.formState.errors.email]} />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">密码</FieldLabel>
                <Link
                  href={`/login/forgot-password?redirect=${encodeURIComponent(redirect)}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  忘记密码？
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!passwordForm.formState.errors.password}
                disabled={passwordForm.formState.isSubmitting}
                {...passwordForm.register("password")}
              />
              <FieldError errors={[passwordForm.formState.errors.password]} />
            </Field>

            {serverError && <FieldError>{serverError}</FieldError>}

            <Field>
              <Button
                type="submit"
                className="w-full"
                disabled={passwordForm.formState.isSubmitting}
                onClick={passwordForm.handleSubmit(onPasswordSubmit)}
              >
                {passwordForm.formState.isSubmitting ? (
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
      )}

      {/* ── 验证码登录 ─────────────────────────────────────────── */}
      {tab === "otp" && (
        <form>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="otp-email">邮箱</FieldLabel>
              <Input
                id="otp-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!otpForm.formState.errors.email}
                disabled={otpForm.formState.isSubmitting || otpSent}
                {...otpForm.register("email")}
              />
              <FieldError errors={[otpForm.formState.errors.email]} />
            </Field>

            {serverError && <FieldError>{serverError}</FieldError>}

            <Field>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  otpForm.formState.isSubmitting ||
                  countdown > 0
                }
                onClick={otpForm.handleSubmit(onSendOtp)}
              >
                {otpForm.formState.isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin opacity-70" />
                    发送中…
                  </>
                ) : countdown > 0 ? (
                  `${countdown}s 后可重新发送`
                ) : (
                  "发送验证码"
                )}
              </Button>
            </Field>

            <FieldSeparator>或</FieldSeparator>
            <WechatAuthButton action="登录" />
          </FieldGroup>
        </form>
      )}

      <FieldDescription className="px-6 text-center">
        点击继续即表示您同意我们的{" "}
        <a href="#">服务条款</a>
        {" "}和{" "}
        <a href="#">隐私政策</a>。
      </FieldDescription>
    </div>
  )
}
