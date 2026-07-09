"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { DashboardLayout } from "@/components/layouts/dashboard"
import { getProfileNavGroups } from "@/modules/profile/config"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useUserStore((s) => s.accessToken)
  const accountType = useUserStore((s) => s.user?.accountType)
  const mustChangePassword = useUserStore((s) => s.user?.mustChangePassword)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!accessToken) {
      router.replace(`/login?redirect=${pathname}`)
      return
    }
    if (
      mustChangePassword &&
      pathname !== "/profile/settings" &&
      !pathname.startsWith("/login")
    ) {
      router.replace("/profile/settings?forceChange=1")
    }
  }, [hasHydrated, accessToken, mustChangePassword, pathname, router])

  if (!hasHydrated) return null
  if (!accessToken) return null

  return (
    <DashboardLayout navGroups={getProfileNavGroups(accountType)}>
      {children}
    </DashboardLayout>
  )
}
