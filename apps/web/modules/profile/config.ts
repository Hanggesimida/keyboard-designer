import {
  LayoutDashboard,
  Keyboard,
  Settings,
  ShoppingBag,
  MapPin,
  type LucideIcon,
} from "lucide-react"

export interface ProfileNavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  disabled?: boolean
}

export interface ProfileNavGroup {
  title?: string
  items: ProfileNavItem[]
}

export const profileNavGroups: ProfileNavGroup[] = [
  {
    items: [
      {
        label: "概览",
        href: "/profile",
        icon: LayoutDashboard,
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
