"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Keyboard } from "lucide-react"
import { useUserStore } from "@/store/userStore"
import { useRouter } from "next/navigation"

export function HomeHeader() {
  const [scrolled, setScrolled] = useState(false)
  const accessToken = useUserStore((s) => s.accessToken)
  const logout = useUserStore((s) => s.logout)
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleLogout = () => {
    logout()
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 px-4">
      <nav
        className={`flex items-center gap-4 sm:gap-6 px-4 sm:px-5 h-11 rounded-full border transition-all duration-500 ease-out ${
          scrolled
            ? "border-white/10 bg-white/[0.06] backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            : "border-white/8 bg-white/[0.04] backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
        }`}
        style={{ backdropFilter: "blur(24px) saturate(1.8)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center">
            <Keyboard size={14} className="text-white/80" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-white/90">
            Keyboard Designer
          </span>
        </Link>

        {/* Nav links - 手机端隐藏 */}
        <div className="hidden sm:flex items-center gap-1">
          <div className="w-px h-4 bg-white/10 mr-2" />
          <a
            href="#features"
            className="px-3 py-1 text-xs font-medium text-white/50 hover:text-white/90 rounded-full hover:bg-white/[0.06] transition-all duration-200"
          >
            功能特性
          </a>
          <div className="w-px h-4 bg-white/10 ml-2" />
        </div>

        {/* 手机端分隔线 */}
        <div className="block sm:hidden w-px h-4 bg-white/10" />

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {accessToken ? (
            <>
              <Link
                href="/design"
                className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#0d0d0d] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
              >
                开始设计
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs font-medium text-white/45 hover:text-white/80 rounded-full hover:bg-white/[0.06] transition-all duration-200"
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-white/55 hover:text-white/90 rounded-full hover:bg-white/[0.06] transition-all duration-200"
              >
                登录
              </Link>
              <Link
                href="/design"
                className="px-3.5 py-1.5 text-xs font-semibold bg-white text-[#0d0d0d] rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200"
              >
                开始设计
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
