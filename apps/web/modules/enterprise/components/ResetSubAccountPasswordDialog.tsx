"use client"

import { useState } from "react"
import { Copy, Check, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
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
import { resolveErrorMessage } from "@/lib/api/request"

interface ResetSubAccountPasswordDialogProps {
  subAccount: SubAccountSummary | null
  onOpenChange: (open: boolean) => void
}

export function ResetSubAccountPasswordDialog({
  subAccount,
  onOpenChange,
}: ResetSubAccountPasswordDialogProps) {
  const t = useTranslations("Enterprise")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
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
        setError(resolveErrorMessage(err, t("resetFailed"), tErrors("sessionExpired")))
      },
    })
  }

  function handleCopy() {
    if (!subAccount || !initialPassword) return
    navigator.clipboard
      .writeText(t("resetClipboard", { email: subAccount.email, password: initialPassword }))
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
              <DialogTitle>{t("passwordReset")}</DialogTitle>
              <DialogDescription>
                {t("resetShareHint")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("email")}</p>
                <p className="font-mono text-sm text-foreground">{subAccount?.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("newInitialPassword")}</p>
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
                {copied ? t("copied") : t("copyLogin")}
              </Button>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer"
              >
                {t("done")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("resetTitle")}</DialogTitle>
              <DialogDescription>
                {t("resetConfirm")}
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
                {tCommon("cancel")}
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
                    {t("resetting")}
                  </>
                ) : (
                  t("confirmReset")
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
