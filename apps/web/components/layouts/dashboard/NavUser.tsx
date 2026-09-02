"use client"

import { UserCircle, LogOut, MoreVertical, ShieldCheck, Building2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useUserStore } from "@/store/userStore"
import type { AccountType } from "@/lib/api/users"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import { useRouter } from "@/i18n/navigation"

function AccountTypeBadge({ accountType }: { accountType: AccountType }) {
  const t = useTranslations("Dashboard")
  if (accountType === "ENTERPRISE_MAIN") {
    return (
      <Badge
        variant="outline"
        className="h-4 gap-0.5 border-blue-400/30 px-1 py-0 text-[10px] font-normal text-blue-500"
      >
        <Building2 size={9} />
        {t("enterpriseMain")}
      </Badge>
    )
  }
  if (accountType === "ENTERPRISE_SUB") {
    return (
      <Badge
        variant="outline"
        className="h-4 px-1 py-0 text-[10px] font-normal text-muted-foreground"
      >
        {t("enterpriseSub")}
      </Badge>
    )
  }
  return null
}

export function NavUser() {
  const t = useTranslations("Dashboard")
  const router = useRouter()
  const { isMobile } = useSidebar()
  const user = useUserStore((s) => s.user)
  const logout = useUserStore((s) => s.logout)

  const isAdmin = user?.role === "ADMIN"
  const accountType = user?.accountType
  const displayName = user?.email?.split("@")[0] ?? t("user")
  const email = user?.email ?? ""
  const initials = displayName.slice(0, 2).toUpperCase()

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
                {accountType && (
                  <span className="mt-0.5">
                    <AccountTypeBadge accountType={accountType} />
                  </span>
                )}
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-normal">
                  <span className="truncate font-medium text-foreground">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">{email}</span>
                  {accountType && (
                    <span className="mt-1">
                      <AccountTypeBadge accountType={accountType} />
                    </span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isAdmin && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer">
                    <UserCircle className="text-muted-foreground" />
                    {t("profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/admin")} className="cursor-pointer">
                    <ShieldCheck className="text-muted-foreground" />
                    {t("admin")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="text-muted-foreground" />
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
