import { ShoppingBag } from "lucide-react"
import type { NavGroup } from "@/modules/dashboard"

export const adminNavGroups: NavGroup[] = [
  {
    title: "管理",
    items: [
      { href: "/admin/orders", label: "订单管理", icon: ShoppingBag },
    ],
  },
]
