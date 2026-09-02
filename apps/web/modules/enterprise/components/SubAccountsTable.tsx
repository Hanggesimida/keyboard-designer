"use client"

import { useState } from "react"
import { UserX, UserCheck, Loader2, Users, KeyRound } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { enUS, zhCN } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useSubAccounts, useUpdateSubAccount } from "@/hooks/queries/enterprise/useEnterprise"
import { ProfileEmptyState } from "@/modules/profile"
import type { SubAccountSummary } from "@/lib/api/enterprise"
import { CreateSubAccountDialog } from "./CreateSubAccountDialog"
import { ResetSubAccountPasswordDialog } from "./ResetSubAccountPasswordDialog"

interface SubAccountsTableProps {
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}

export function SubAccountsTable({ createOpen, onCreateOpenChange }: SubAccountsTableProps) {
  const t = useTranslations("Enterprise")
  const tCommon = useTranslations("Common")
  const locale = useLocale()
  const dateLocale = locale === "zh" ? zhCN : enUS
  const { data: subAccounts, isLoading } = useSubAccounts()
  const { mutate: updateSubAccount, isPending: isUpdating } = useUpdateSubAccount()
  const [toggleTarget, setToggleTarget] = useState<SubAccountSummary | null>(null)
  const [resetTarget, setResetTarget] = useState<SubAccountSummary | null>(null)

  function handleConfirmToggle() {
    if (!toggleTarget) return
    updateSubAccount(
      { id: toggleTarget.id, payload: { isActive: !toggleTarget.isActive } },
      { onSuccess: () => setToggleTarget(null) },
    )
  }

  return (
    <div className="space-y-4">
      {isLoading ? (
        <SubAccountsSkeleton />
      ) : !subAccounts || subAccounts.length === 0 ? (
        <ProfileEmptyState
          icon={Users}
          title={t("noSubAccounts")}
          description={t("emptyHint")}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">{t("designer")}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t("status")}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t("stats")}</th>
                <th className="px-4 py-2.5 text-left font-medium">{t("createdAt")}</th>
                <th className="px-4 py-2.5 text-right font-medium">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subAccounts.map((sub) => (
                <tr key={sub.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground/85">{sub.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground/70">{sub.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {sub.isActive ? (
                      <Badge variant="secondary" className="font-normal">
                        {t("active")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-destructive/70">
                        {t("disabled")}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/80">
                    {t("statsLine", {
                      draft: sub.draftCount,
                      submitted: sub.submittedCount,
                      ordered: sub.orderedCount,
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/55">
                    {formatDistanceToNow(new Date(sub.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => setResetTarget(sub)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <KeyRound size={13} />
                        {t("resetPassword")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => setToggleTarget(sub)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        {sub.isActive ? (
                          <>
                            <UserX size={13} />
                            {t("disable")}
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            {t("enable")}
                          </>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateSubAccountDialog open={createOpen} onOpenChange={onCreateOpenChange} />

      <ResetSubAccountPasswordDialog
        subAccount={resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      />

      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.isActive ? t("disable") : t("enable")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive ? t("disableConfirm") : t("enableConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdating}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmToggle()
              }}
            >
              {isUpdating ? <Loader2 size={13} className="animate-spin" /> : tCommon("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubAccountsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-xl border border-border" />
      ))}
    </div>
  )
}
