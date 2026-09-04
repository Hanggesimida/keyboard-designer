"use client"

import * as React from "react"
import { Home, Keyboard, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import type { NavGroup } from "./types"
import { NavUser } from "./NavUser"
import { Link, usePathname } from "@/i18n/navigation"

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navGroups: NavGroup[]
  title?: string
  headerIcon?: LucideIcon
  headerHref?: string
  headerRight?: React.ReactNode
}

export function DashboardSidebar({ navGroups, title, headerIcon: HeaderIcon = Keyboard, headerHref = "/profile", headerRight, ...props }: DashboardSidebarProps) {
  const t = useTranslations("Common")
  const tDash = useTranslations("Dashboard")
  const pathname = usePathname()
  const resolvedTitle = title ?? t("appName")

  function isActive(href: string, exact?: boolean) {
    if (exact || href === "/profile") return pathname === href
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <div className="flex items-center">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={headerHref} />}
                className="data-[slot=sidebar-menu-button]:p-1.5!"
              >
                <HeaderIcon className="size-5!" />
                <span className="text-base font-semibold">{resolvedTitle}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {headerRight && (
            <div className="shrink-0 pr-1">
              {headerRight}
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group, i) => (
          <SidebarGroup key={i}>
            {group.title && <SidebarGroupLabel>{group.title}</SidebarGroupLabel>}
            <SidebarMenu className="gap-1">
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.disabled ? "#" : item.href} />}
                    isActive={isActive(item.href, item.exact)}
                    disabled={item.disabled}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/" />}>
                <Home />
                <span>{tDash("backHome")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
