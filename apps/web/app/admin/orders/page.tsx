import { Suspense } from "react"
import { OrdersTable } from "@/modules/admin"
import { PageHeader } from "@/components/ui/PageHeader"

export default function AdminOrdersPage() {
  return (
    <div>
      <PageHeader title="订单管理" description="管理所有用户的键盘定制订单，进行接单、生产、发货等状态操作。" />

      <Suspense>
        <OrdersTable />
      </Suspense>
    </div>
  )
}
