"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { login, loginSchema, type LoginInput } from "@/lib/api/auth"
import { useUserStore } from "@/store/userStore"

export default function LoginPage() {
  const router = useRouter()
  const setToken = useUserStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)

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
      const res = await login(data)
      setToken(res.accessToken)
      router.push("/design")
    } catch {
      setServerError("邮箱或密码错误，请重试")
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center px-4 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 主光晕 */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-[0.18]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(120,80,255,0.7) 0%, rgba(60,130,255,0.35) 45%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* 副光晕 */}
        <div
          className="absolute top-1/3 right-1/4 w-[250px] h-[250px] rounded-full opacity-[0.08]"
          style={{
            background:
              "radial-gradient(circle, rgba(52,211,153,0.6) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* 细网格 */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* 返回首页 */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/70 transition-colors duration-200 group"
      >
        <ArrowLeft
          size={14}
          className="group-hover:-translate-x-0.5 transition-transform duration-200"
        />
        返回首页
      </Link>

      {/* 登录卡片 */}
      <div className="relative w-full max-w-sm">
        {/* 卡片发光边框 */}
        <div
          className="absolute -inset-px rounded-2xl pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(120,80,255,0.2) 0%, transparent 50%, rgba(60,130,255,0.12) 100%)",
          }}
        />

        <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8">

          {/* 标题 */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
              欢迎回来
            </h1>
            <p className="text-sm text-white/35 leading-relaxed">
              登录你的账号，继续创作
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/50 tracking-wide">
                邮箱
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
                className="w-full h-10 px-3.5 rounded-xl border bg-white/[0.05] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-200
                  border-white/10 hover:border-white/20
                  focus:border-white/30 focus:bg-white/[0.08]
                  disabled:opacity-50"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-red-400/80 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/50 tracking-wide">
                密码
              </label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className="w-full h-10 px-3.5 rounded-xl border bg-white/[0.05] text-sm text-white placeholder:text-white/25 outline-none transition-all duration-200
                  border-white/10 hover:border-white/20
                  focus:border-white/30 focus:bg-white/[0.08]
                  disabled:opacity-50"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="text-xs text-red-400/80 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* 服务端错误 */}
            {serverError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3.5 py-2.5">
                <p className="text-xs text-red-400/90">{serverError}</p>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full h-10 rounded-xl bg-white text-[#0d0d0d] text-sm font-semibold flex items-center justify-center gap-2
                hover:bg-white/92 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 shadow-[0_0_24px_rgba(255,255,255,0.12)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin opacity-70" />
                  登录中…
                </>
              ) : (
                "登录"
              )}
            </button>
          </form>

          {/* 分隔线 */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-white/20">或</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* 注册引导 */}
          <p className="text-center text-xs text-white/30">
            还没有账号？{" "}
            <Link
              href="/register"
              className="text-white/60 hover:text-white/90 transition-colors duration-200 underline underline-offset-2 decoration-white/20 hover:decoration-white/50"
            >
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
