import { LayoutDashboard, ShoppingBag, Kanban, Users } from "lucide-react"
import type { NavGroup } from "@/components/layouts/dashboard"

export const adminNavGroups: NavGroup[] = [
  {
    title: "管理",
    items: [
      { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "订单管理", icon: ShoppingBag },
      { href: "/admin/production-board", label: "生产看板", icon: Kanban },
      { href: "/admin/users", label: "用户管理", icon: Users },
    ],
  },
]
