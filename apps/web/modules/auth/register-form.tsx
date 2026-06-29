"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"

import { register as registerApi, registerSchema, type RegisterInput } from "@/lib/api/auth"
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

export function RegisterForm() {
  const router = useRouter()
  const setToken = useUserStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    try {
      const res = await registerApi({ ...data, turnstileToken })
      getQueryClient().clear()
      setToken(res.accessToken)
      router.push("/design")
    } catch {
      setServerError("注册失败，该邮箱可能已被使用")
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
            <h1 className="text-xl font-bold">创建账号</h1>
            <FieldDescription>
              已有账号？ <Link href="/login">立即登录</Link>
            </FieldDescription>
          </div>

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
              autoComplete="new-password"
              placeholder="至少 6 位"
              aria-invalid={!!errors.password}
              disabled={isSubmitting}
              {...register("password")}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <TurnstileWidget
            onSuccess={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
          />

          {serverError && <FieldError>{serverError}</FieldError>}

          <Field>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !turnstileToken}
              onClick={handleSubmit(onSubmit)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  注册中…
                </>
              ) : (
                "创建账号"
              )}
            </Button>
          </Field>

          <FieldSeparator>或</FieldSeparator>

          <WechatAuthButton action="注册" />
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
