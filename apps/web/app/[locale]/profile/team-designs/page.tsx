"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { TeamDesignsTable } from "@/modules/enterprise"
import { PageHeader } from "@/components/layouts/PageHeader"
import { useUserStore } from "@/store/userStore"
import { useRouter } from "@/i18n/navigation"

export default function ProfileTeamDesignsPage() {
  const t = useTranslations("Profile.teamDesigns")
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
        title={t("title")}
        description={t("subtitle")}
      />
      <TeamDesignsTable />
    </div>
  )
}
