"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, ArrowLeft } from "lucide-react"
import { LogoIcon } from "@/components/layouts/Logo"

import { verifyOtp, verifyOtpSchema, type VerifyOtpInput } from "@/lib/api/auth"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"
  const setToken = useUserStore((s) => s.setToken)

  const [email, setEmail] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)

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
      const msg = err instanceof Error ? err.message : "验证失败，请重试"
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
          <span className="sr-only">键盘设计器</span>
        </Link>
        <h1 className="text-xl font-bold">输入验证码</h1>
        {email && (
          <FieldDescription>
            验证码已发送至 <span className="text-foreground font-medium">{email}</span>
          </FieldDescription>
        )}
      </div>

      <form>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="otp">6 位验证码</FieldLabel>
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
            <FieldDescription>验证码有效期 5 分钟</FieldDescription>
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
                  验证中…
                </>
              ) : (
                "验证并登录"
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
              返回重新发送
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
