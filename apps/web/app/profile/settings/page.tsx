"use client"

import { useState } from "react"
import { useUserStore } from "@/store/userStore"
import { useRouter } from "next/navigation"
import { ProfileLayout, ProfileSection } from "@/modules/profile"
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
  const logout = useUserStore((s) => s.logout)
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <ProfileLayout title="设置" description="管理你的账号信息与偏好设置。">
      <div className="space-y-8">
        {/* 账号信息 */}
        <ProfileSection title="账号信息">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.05]">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40 font-medium">邮箱</span>
              <span className="text-sm text-white/70">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-white/40 font-medium">用户 ID</span>
              <span className="text-xs text-white/30 font-mono">{user?.id ?? "—"}</span>
            </div>
          </div>
        </ProfileSection>

        {/* 危险区域 */}
        <ProfileSection title="危险区域">
          <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/70">退出登录</p>
                <p className="text-xs text-white/35 mt-0.5">
                  退出后需要重新登录才能访问你的数据。
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400/80 border border-red-500/20 rounded-full hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
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
    </ProfileLayout>
  )
}
