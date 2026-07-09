"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { TeamDesignsTable } from "@/modules/enterprise"
import { PageHeader } from "@/components/layouts/PageHeader"
import { useUserStore } from "@/store/userStore"

export default function ProfileTeamDesignsPage() {
  const router = useRouter()
  const accountType = useUserStore((s) => s.user?.accountType)
  const hasHydrated = useUserStore((s) => s._hasHydrated)

  useEffect(() => {
    if (!hasHydrated) return
    if (accountType && accountType !== "ENTERPRISE_MAIN") {
      router.replace("/profile")
    }
  }, [hasHydrated, accountType, router])

  if (!hasHydrated || accountType !== "ENTERPRISE_MAIN") return null

  return (
    <div>
      <PageHeader
        title="团队设计"
        description="查看团队所有设计，审核已提交的方案并批量下单（月结免支付）。"
      />
      <TeamDesignsTable />
    </div>
  )
}
