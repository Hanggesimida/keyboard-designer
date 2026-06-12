import { LayoutDashboard, ShoppingBag } from "lucide-react"
import type { NavGroup } from "@/modules/dashboard"

export const adminNavGroups: NavGroup[] = [
  {
    title: "管理",
    items: [
      { href: "/admin", label: "概览", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "订单管理", icon: ShoppingBag },
    ],
  },
]
