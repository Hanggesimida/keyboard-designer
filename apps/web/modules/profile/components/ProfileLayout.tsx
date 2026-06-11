"use client"

import Link from "next/link"
import { UserCircle2, LayoutDashboard } from "lucide-react"
import { useUserStore } from "@/store/userStore"
import { DashboardLayout } from "@/modules/dashboard"
import { profileNavGroups } from "../config"

interface ProfileLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  headerAction?: React.ReactNode
}

function ProfileSidebarHeader() {
  const user = useUserStore((s) => s.user)
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0">
        <UserCircle2 size={20} className="text-white/40" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate">
          {user?.email?.split("@")[0] ?? "用户"}
        </p>
        <p className="text-xs text-white/35 truncate mt-0.5">
          {user?.email ?? ""}
        </p>
      </div>
    </div>
  )
}

function ProfileSidebarFooterExtras() {
  const user = useUserStore((s) => s.user)
  if (user?.role !== "ADMIN") return null
  return (
    <Link
      href="/admin/orders"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-violet-400/60 hover:text-violet-300 hover:bg-violet-400/[0.06] transition-all duration-200 group"
    >
      <LayoutDashboard
        size={15}
        className="shrink-0 text-violet-400/50 group-hover:text-violet-300 transition-colors"
      />
      <span>管理后台</span>
    </Link>
  )
}

function ProfileDrawerHeader() {
  const user = useUserStore((s) => s.user)
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0 text-xs font-semibold text-white/50">
        {user?.email?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white/80 truncate">
          {user?.email?.split("@")[0] ?? "用户"}
        </p>
        <p className="text-xs text-white/30 truncate">{user?.email ?? ""}</p>
      </div>
    </div>
  )
}

export function ProfileLayout({
  children,
  title,
  description,
  headerAction,
}: ProfileLayoutProps) {
  return (
    <DashboardLayout
      navGroups={profileNavGroups}
      sidebarHeader={<ProfileSidebarHeader />}
      sidebarFooterExtras={<ProfileSidebarFooterExtras />}
      drawerHeader={<ProfileDrawerHeader />}
      backgroundVariant="profile"
      title={title}
      description={description}
      headerAction={headerAction}
    >
      {children}
    </DashboardLayout>
  )
}
