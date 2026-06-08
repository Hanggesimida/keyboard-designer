"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUserStore } from "@/store/userStore"
import { profileNavGroups } from "../config"
import { cn } from "@workspace/ui/lib/utils"
import { UserCircle2, ArrowLeft } from "lucide-react"

export function ProfileSidebar() {
  const pathname = usePathname()
  const user = useUserStore((s) => s.user)

  return (
    <aside className="flex flex-col h-full w-full border-r border-white/[0.06] bg-white/[0.02]">
      {/* 用户信息区 */}
      <div className="px-4 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          {/* 头像占位 */}
          <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center shrink-0">
            <UserCircle2 size={20} className="text-white/40" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/90 truncate">
              {user?.email?.split("@")[0] ?? "用户"}
            </p>
            <p className="text-xs text-white/35 truncate mt-0.5">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {profileNavGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.title && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/25">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.href === "/profile"
                    ? pathname === "/profile"
                    : pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.disabled ? "#" : item.href}
                      aria-disabled={item.disabled}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                        isActive
                          ? "bg-white/[0.08] text-white font-medium"
                          : "text-white/50 hover:text-white/80 hover:bg-white/[0.05]",
                        item.disabled && "pointer-events-none opacity-40"
                      )}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-colors",
                          isActive ? "text-white/80" : "text-white/40"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto text-[10px] font-medium bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 底部：返回首页 */}
      <div className="px-2 py-3 border-t border-white/[0.06]">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all duration-200 group"
        >
          <ArrowLeft
            size={15}
            className="shrink-0 group-hover:-translate-x-0.5 transition-transform duration-200"
          />
          <span>返回首页</span>
        </Link>
      </div>
    </aside>
  )
}
