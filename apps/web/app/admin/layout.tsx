"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LayoutDashboard, UserCircle2, User } from "lucide-react"
import { useUserStore } from "@/store/userStore"
import { DashboardLayout } from "@/modules/dashboard"
import { adminNavGroups } from "@/modules/admin/config"
import { NotificationCenter } from "@/modules/admin/components/NotificationCenter"

function AdminSidebarHeader() {
  const user = useUserStore((s) => s.user)
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={16} className="text-violet-400/70" />
          <span className="text-sm font-semibold text-white/70 tracking-wide">
            管理后台
          </span>
        </div>
        <NotificationCenter />
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0">
          <UserCircle2 size={16} className="text-white/40" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/80">
            {user?.email?.split("@")[0] ?? "管理员"}
          </p>
          <p className="text-[10px] text-violet-400/60">ADMIN</p>
        </div>
      </div>
    </>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const user = useUserStore((s) => s.user)
  const accessToken = useUserStore((s) => s.accessToken)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!accessToken) {
      router.replace("/login?redirect=/admin/orders")
      return
    }
    if (user && user.role !== "ADMIN") {
      router.replace("/")
    }
  }, [hasHydrated, accessToken, user, router])

  if (!hasHydrated) return null
  if (!accessToken || (user && user.role !== "ADMIN")) return null

  const profileLink = (
    <Link
      href="/profile"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200 group"
    >
      <User
        size={15}
        className="shrink-0"
      />
      <span>返回个人页面</span>
    </Link>
  )

  return (
    <DashboardLayout
      navGroups={adminNavGroups}
      sidebarHeader={<AdminSidebarHeader />}
      sidebarFooterExtras={profileLink}
      backgroundVariant="admin"
    >
      {children}
    </DashboardLayout>
  )
}
