"use client"

import { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { useLogout } from "@/hooks/queries/auth/useAuth"
import { useRouter } from "next/navigation"
import { ProfileSection } from "@/modules/profile"
import { PageHeader } from "@/components/layouts/PageHeader"
import { LogOut } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"

export default function ProfileSettingsPage() {
  const user = useUserStore((s) => s.user)
  const logout = useLogout()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader title="账号设置" description="查看账号信息，管理登录状态。" />

        {/* 账号信息 */}
        <ProfileSection title="账号信息">
          <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground/70 font-medium">邮箱</span>
              <span className="text-sm text-foreground/70">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground/70 font-medium">用户 ID</span>
              <span className="text-xs text-muted-foreground/55 font-mono">{user?.id ?? "—"}</span>
            </div>
          </div>
        </ProfileSection>

        {/* 危险区域 */}
        <ProfileSection title="危险区域">
          <div className="rounded-xl border border-destructive/10 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground/70">退出登录</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  退出后需要重新登录才能访问你的数据。
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-destructive/80 border border-destructive/20 rounded-full hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
              >
                <LogOut size={12} />
                退出
              </button>
            </div>
          </div>
        </ProfileSection>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>确认退出登录？</DialogTitle>
            <DialogDescription>
              退出后需要重新登录才能访问你的数据。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
              取消
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="cursor-pointer">
              <LogOut />
              退出登录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
