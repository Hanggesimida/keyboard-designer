"use client"

import { useState } from "react"
import { UserX, UserCheck, Loader2, Users, KeyRound } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"
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
          title="还没有子账号"
          description="创建子账号后，设计师可独立登录设计并提交方案给你审核。"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">设计师</th>
                <th className="px-4 py-2.5 text-left font-medium">状态</th>
                <th className="px-4 py-2.5 text-left font-medium">设计统计</th>
                <th className="px-4 py-2.5 text-left font-medium">创建时间</th>
                <th className="px-4 py-2.5 text-right font-medium">操作</th>
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
                        正常
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="font-normal text-destructive/70">
                        已禁用
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/80">
                    草稿 {sub.draftCount} · 已提交 {sub.submittedCount} · 已下单{" "}
                    {sub.orderedCount}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground/55">
                    {formatDistanceToNow(new Date(sub.createdAt), {
                      addSuffix: true,
                      locale: zhCN,
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
                        重置密码
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
                            禁用
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            启用
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
              {toggleTarget?.isActive ? "禁用子账号" : "启用子账号"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.isActive
                ? `确认禁用「${toggleTarget?.name ?? toggleTarget?.email}」？禁用后该账号将无法登录，但历史设计数据保留。`
                : `确认启用「${toggleTarget?.name ?? toggleTarget?.email}」？启用后该账号可重新登录。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={isUpdating}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmToggle()
              }}
            >
              {isUpdating ? <Loader2 size={13} className="animate-spin" /> : "确认"}
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
