"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { SubAccountsTable } from "@/modules/enterprise"
import { PageHeader } from "@/components/layouts/PageHeader"
import { Button } from "@workspace/ui/components/button"
import { useUserStore } from "@/store/userStore"

export default function ProfileTeamPage() {
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
        title="团队管理"
        description="创建并管理子账号（设计师），子账号可独立登录设计并提交方案给你审核。"
        action={
          <Button
            className="w-full sm:w-auto cursor-pointer"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={15} />
            新增子账号
          </Button>
        }
      />
      <SubAccountsTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </div>
  )
}
