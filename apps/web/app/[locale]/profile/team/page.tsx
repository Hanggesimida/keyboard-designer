"use client"

import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { SubAccountsTable } from "@/modules/enterprise"
import { PageHeader } from "@/components/layouts/PageHeader"
import { Button } from "@workspace/ui/components/button"
import { useUserStore } from "@/store/userStore"
import { useRouter } from "@/i18n/navigation"

export default function ProfileTeamPage() {
  const t = useTranslations("Profile.team")
  const router = useRouter()
  const accountType = useUserStore((s) => s.user?.accountType)
  const hasHydrated = useUserStore((s) => s._hasHydrated)
  const [createOpen, setCreateOpen] = useState(false)

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
        action={
          <Button
            className="w-full sm:w-auto cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={15} />
            {t("add")}
          </Button>
        }
      />
      <SubAccountsTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </div>
  )
}
