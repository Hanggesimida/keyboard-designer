import {
  LayoutDashboard,
  Keyboard,
  Settings,
  ShoppingBag,
  MapPin,
  Users,
  ClipboardList,
} from "lucide-react"
import type { NavItem, NavGroup } from "@/components/layouts/dashboard"
import type { AccountType } from "@/lib/api/users"

export type { NavItem, NavGroup }
export type ProfileNavItem = NavItem
export type ProfileNavGroup = NavGroup

const BASE_NAV_ITEMS: NavItem[] = [
  {
    label: "overview",
    href: "/profile",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "keyboards",
    href: "/profile/keyboards",
    icon: Keyboard,
  },
  {
    label: "orders",
    href: "/profile/orders",
    icon: ShoppingBag,
  },
]

/** 企业主账号专属导航：团队管理（子账号）与团队设计看板（审核 + 批量下单） */
const ENTERPRISE_MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: "team",
    href: "/profile/team",
    icon: Users,
  },
  {
    label: "teamDesigns",
    href: "/profile/team-designs",
    icon: ClipboardList,
  },
]

/** 根据账号类型生成个人中心导航；企业主账号会额外看到团队管理相关入口 */
export function getProfileNavGroups(accountType?: AccountType): NavGroup[] {
  const items =
    accountType === "ENTERPRISE_MAIN"
      ? [...BASE_NAV_ITEMS, ...ENTERPRISE_MAIN_NAV_ITEMS]
      : BASE_NAV_ITEMS

  return [
    { items },
    {
      title: "account",
      items: [
        {
          label: "addresses",
          href: "/profile/addresses",
          icon: MapPin,
        },
        {
          label: "settings",
          href: "/profile/settings",
          icon: Settings,
        },
      ],
    },
  ]
}

export const profileNavGroups: NavGroup[] = getProfileNavGroups()
