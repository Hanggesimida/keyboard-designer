import { Suspense } from "react"
import { UsersTable } from "@/modules/admin"
import { PageHeader } from "@/components/layouts/PageHeader"

export default function AdminUsersPage() {
  return (
    <div>
      <PageHeader
        title="用户管理"
        description="查看系统用户，并设置其是否为管理员。"
      />

      <Suspense>
        <UsersTable />
      </Suspense>
    </div>
  )
}
