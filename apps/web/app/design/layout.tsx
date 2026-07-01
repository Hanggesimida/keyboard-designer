"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const accessToken = useUserStore((s) => s.accessToken)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (!accessToken) {
      router.replace(`/login?redirect=${pathname}`)
    }
  }, [hasHydrated, accessToken, pathname, router])

  if (!hasHydrated) return null
  if (!accessToken) return null

  return <>{children}</>
}
