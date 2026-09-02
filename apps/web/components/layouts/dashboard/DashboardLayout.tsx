"use client"

import { usePathname } from "@/i18n/navigation"
import type { LucideIcon } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"
import { DashboardSidebar } from "./DashboardSidebar"
import type { NavGroup } from "./types"

interface DashboardLayoutProps {
  children: React.ReactNode
  navGroups: NavGroup[]
  title?: string
  headerIcon?: LucideIcon
  headerHref?: string
  headerRight?: React.ReactNode
}

export function DashboardLayout({
  children,
  navGroups,
  title,
  headerIcon,
  headerHref,
  headerRight,
}: DashboardLayoutProps) {
  const pathname = usePathname()

  const pageTitle = navGroups
    .flatMap((g) => g.items)
    .find((item) =>
      item.exact || item.href === headerHref
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(item.href + "/")
    )?.label ?? title

  return (
    <SidebarProvider style={{ "--sidebar-width": "19rem" } as React.CSSProperties}>
      <DashboardSidebar navGroups={navGroups} title={title} headerIcon={headerIcon} headerHref={headerHref} headerRight={headerRight} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
          {pageTitle && (
            <span className="text-base font-semibold">{pageTitle}</span>
          )}
        </header>
        <div className="flex-1 mx-auto w-full max-w-[1200px] px-4 pb-24 pt-3 sm:px-6 md:px-8 md:pt-10 lg:px-12 xl:px-16">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
