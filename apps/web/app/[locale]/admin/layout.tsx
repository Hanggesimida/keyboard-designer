"use client"

import { useEffect } from "react"
import { Settings2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useUserStore } from "@/store/userStore"
import { DashboardLayout } from "@/components/layouts/dashboard"
import { adminNavGroups } from "@/modules/admin/config"
import { NotificationCenter } from "@/modules/admin/components/notification/NotificationCenter"
import { useRouter } from "@/i18n/navigation"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tNav = useTranslations("Admin.nav")
  const tMeta = useTranslations("Metadata")
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

  const navGroups = adminNavGroups.map((group) => ({
    ...group,
    title: group.title ? tNav(group.title as "group") : group.title,
    items: group.items.map((item) => ({
      ...item,
      label: tNav(item.label as "overview" | "orders" | "board" | "users"),
    })),
  }))

  return (
    <DashboardLayout
      navGroups={navGroups}
      title={tMeta("adminTitle")}
      headerIcon={Settings2}
      headerHref="/admin"
      headerRight={<NotificationCenter />}
    >
      {children}
    </DashboardLayout>
  )
}
