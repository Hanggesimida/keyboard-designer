"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useUserStore } from "@/store/userStore"
import { useLogout } from "@/hooks/queries/auth/useAuth"
import { ProfileSection } from "@/modules/profile"
import { ChangePasswordSection } from "@/modules/profile/components/ChangePasswordSection"
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
import { useRouter } from "@/i18n/navigation"

export function ProfileSettingsContent() {
  const t = useTranslations("Profile.settings")
  const tCommon = useTranslations("Common")
  const user = useUserStore((s) => s.user)
  const logout = useLogout()
  const router = useRouter()
  const searchParams = useSearchParams()
  const forceChange = searchParams.get("forceChange") === "1"
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader title={t("title")} description={t("subtitle")} />

        <ProfileSection title={t("info")}>
          <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border/50">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground/70 font-medium">{t("email")}</span>
              <span className="text-sm text-foreground/70">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground/70 font-medium">{t("userId")}</span>
              <span className="text-xs text-muted-foreground/55 font-mono">{user?.id ?? "—"}</span>
            </div>
          </div>
        </ProfileSection>

        <ChangePasswordSection
          hasPassword={user?.hasPassword ?? false}
          forceChange={forceChange || user?.mustChangePassword}
        />

        <ProfileSection title={t("danger")}>
          <div className="rounded-xl border border-destructive/10 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground/70">{t("signOut")}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {t("signOutHint")}
                </p>
              </div>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-destructive/80 border border-destructive/20 rounded-full hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all duration-200 shrink-0 cursor-pointer"
              >
                <LogOut size={12} />
                {t("signOutButton")}
              </button>
            </div>
          </div>
        </ProfileSection>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("signOutConfirm")}</DialogTitle>
            <DialogDescription>
              {t("signOutHint")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
              {tCommon("cancel")}
            </Button>
            <Button variant="destructive" onClick={handleLogout} className="cursor-pointer">
              <LogOut />
              {t("signOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
