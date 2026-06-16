import {
  LayoutDashboard,
  Keyboard,
  Settings,
  ShoppingBag,
  MapPin,
} from "lucide-react"
import type { NavItem, NavGroup } from "@/components/layouts/dashboard"

export type { NavItem, NavGroup }
export type ProfileNavItem = NavItem
export type ProfileNavGroup = NavGroup

export const profileNavGroups: NavGroup[] = [
  {
    items: [
      {
        label: "概览",
        href: "/profile",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "我的键盘",
        href: "/profile/keyboards",
        icon: Keyboard,
      },
      {
        label: "我的订单",
        href: "/profile/orders",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "账号",
    items: [
      {
        label: "地址管理",
        href: "/profile/addresses",
        icon: MapPin,
      },
      {
        label: "设置",
        href: "/profile/settings",
        icon: Settings,
      },
    ],
  },
]
