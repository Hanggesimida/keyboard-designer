"use client"

import { useState } from "react"
import { Copy, Check, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { useResetSubAccountPassword } from "@/hooks/queries/enterprise/useEnterprise"
import type { SubAccountSummary } from "@/lib/api/enterprise"
import { ApiError } from "@/lib/api/request"

interface ResetSubAccountPasswordDialogProps {
  subAccount: SubAccountSummary | null
  onOpenChange: (open: boolean) => void
}

export function ResetSubAccountPasswordDialog({
  subAccount,
  onOpenChange,
}: ResetSubAccountPasswordDialogProps) {
  const [initialPassword, setInitialPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { mutate: resetPassword, isPending } = useResetSubAccountPassword()

  function handleOpenChange(next: boolean) {
    if (!next) {
      setInitialPassword(null)
      setError(null)
      setCopied(false)
    }
    onOpenChange(next)
  }

  function handleConfirm() {
    if (!subAccount) return
    setError(null)
    resetPassword(subAccount.id, {
      onSuccess: (result) => setInitialPassword(result.initialPassword),
      onError: (err) => {
        setError(err instanceof ApiError ? err.message : "重置失败，请重试")
      },
    })
  }

  function handleCopy() {
    if (!subAccount || !initialPassword) return
    navigator.clipboard
      .writeText(`邮箱：${subAccount.email}\n新初始密码：${initialPassword}`)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
  }

  return (
    <Dialog open={!!subAccount} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md">
        {initialPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>密码已重置</DialogTitle>
              <DialogDescription>
                请将以下新登录信息转告设计师，密码仅在此展示一次。设计师下次登录后须设置自己的密码。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">邮箱</p>
                <p className="font-mono text-sm text-foreground">{subAccount?.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">新初始密码</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {initialPassword}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopy}
                className="cursor-pointer"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "已复制" : "复制登录信息"}
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer"
              >
                完成
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>重置子账号密码</DialogTitle>
              <DialogDescription>
                将为「{subAccount?.name ?? subAccount?.email}」生成新的初始密码。重置后该设计师下次登录须修改为自己的密码。
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                <p className="text-xs text-destructive/90">{error}</p>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer"
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={handleConfirm}
                className="cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    重置中...
                  </>
                ) : (
                  "确认重置"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
