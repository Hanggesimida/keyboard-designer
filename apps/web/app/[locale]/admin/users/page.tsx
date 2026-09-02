import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { UsersTable } from "@/modules/admin"
import { PageHeader } from "@/components/layouts/PageHeader"

export default async function AdminUsersPage() {
  const t = await getTranslations("Admin.users")
  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
      />

      <Suspense>
        <UsersTable />
      </Suspense>
    </div>
  )
}
