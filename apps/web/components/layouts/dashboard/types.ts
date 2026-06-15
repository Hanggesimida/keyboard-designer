import type { LucideIcon } from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  disabled?: boolean
  /** 精确匹配路径，防止前缀匹配误高亮 */
  exact?: boolean
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}
