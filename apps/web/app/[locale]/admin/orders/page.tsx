import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { OrdersTable } from "@/modules/admin"
import { PageHeader } from "@/components/layouts/PageHeader"

export default async function AdminOrdersPage() {
  const t = await getTranslations("Admin.orders")
  return (
    <div>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Suspense>
        <OrdersTable />
      </Suspense>
    </div>
  )
}
