"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeft, Menu, X } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import type { NavGroup } from "../types"

interface DashboardMobileHeaderProps {
  navGroups: NavGroup[]
  /** 抽屉内顶部的用户信息或标题区域 */
  drawerHeader?: React.ReactNode
}

export function DashboardMobileHeader({
  navGroups,
  drawerHeader,
}: DashboardMobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  // 路由变化时自动关闭抽屉
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-12 border-b border-white/[0.06] bg-[#0d0d0d]/80 backdrop-blur-xl">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors duration-200 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform duration-200"
          />
          首页
        </Link>

        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          aria-label="切换菜单"
        >
          {open ? <X /> : <Menu />}
        </Button>
      </header>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          "md:hidden fixed top-12 left-0 right-0 z-40 border-b border-white/[0.06] bg-[#0d0d0d]/95 backdrop-blur-xl transition-all duration-300 overflow-y-auto",
          open
            ? "max-h-[calc(100dvh-3rem)] opacity-100"
            : "max-h-0 opacity-0 pointer-events-none",
        )}
      >
        {drawerHeader && (
          <div className="px-4 py-4 border-b border-white/[0.06]">
            {drawerHeader}
          </div>
        )}

        <nav className="px-2 py-3 space-y-4">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {group.title && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.exact || item.href === "/profile"
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                  const Icon = item.icon

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.disabled ? "#" : item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                          isActive
                            ? "bg-white/[0.08] text-white font-medium"
                            : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]",
                          item.disabled && "pointer-events-none opacity-40",
                        )}
                      >
                        <Icon
                          size={15}
                          className={cn(
                            "shrink-0",
                            isActive ? "text-white/80" : "text-white/40",
                          )}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  )
}
