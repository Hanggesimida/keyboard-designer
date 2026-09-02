import { LayoutDashboard, ShoppingBag, Kanban, Users } from "lucide-react"
import type { NavGroup } from "@/components/layouts/dashboard"

export const adminNavGroups: NavGroup[] = [
  {
    title: "group",
    items: [
      { href: "/admin", label: "overview", icon: LayoutDashboard, exact: true },
      { href: "/admin/orders", label: "orders", icon: ShoppingBag },
      { href: "/admin/production-board", label: "board", icon: Kanban },
      { href: "/admin/users", label: "users", icon: Users },
    ],
  },
]
