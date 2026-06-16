"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Settings2 } from "lucide-react"
import { useUserStore } from "@/store/userStore"
import { DashboardLayout } from "@/components/layouts/dashboard"
import { adminNavGroups } from "@/modules/admin/config"
import { NotificationCenter } from "@/modules/admin/components/NotificationCenter"

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

  return (
    <DashboardLayout
      navGroups={adminNavGroups}
      title="烬炆外设后台"
      headerIcon={Settings2}
      headerHref="/admin"
      headerRight={<NotificationCenter />}
    >
      {children}
    </DashboardLayout>
  )
}
