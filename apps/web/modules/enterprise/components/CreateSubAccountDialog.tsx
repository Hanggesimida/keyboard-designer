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
import { useCreateSubAccount } from "@/hooks/queries/enterprise/useEnterprise"
import type { CreateSubAccountResult } from "@/lib/api/enterprise"
import { resolveErrorMessage } from "@/lib/api/request"

interface CreateSubAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSubAccountDialog({
  open,
  onOpenChange,
}: CreateSubAccountDialogProps) {
  const t = useTranslations("Enterprise")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreateSubAccountResult | null>(null)
  const [copied, setCopied] = useState(false)

  const { mutate: createSubAccount, isPending } = useCreateSubAccount()

  function reset() {
    setEmail("")
    setDisplayName("")
    setError(null)
    setCreated(null)
    setCopied(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    createSubAccount(
      { email, displayName },
      {
        onSuccess: (result) => setCreated(result),
        onError: (err) => {
          setError(resolveErrorMessage(err, t("createFailed"), tErrors("sessionExpired")))
        },
      },
    )
  }

  function handleCopy() {
    if (!created) return
    navigator.clipboard
      .writeText(t("clipboard", { email: created.email, password: created.initialPassword }))
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
  }

  const inputCls =
    "w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/45 outline-none transition-colors hover:border-border focus:border-ring focus:bg-muted/50 disabled:opacity-50"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("created")}</DialogTitle>
              <DialogDescription>
                {t("shareHint")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">{t("email")}</p>
                <p className="font-mono text-sm text-foreground">{created.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">{t("initialPassword")}</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {created.initialPassword}
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
              <DialogTitle>{t("addTitle")}</DialogTitle>
              <DialogDescription>
                {t("addBody")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div>
                <label className={labelCls}>{t("loginEmail")}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="designer@example.com"
                  disabled={isPending}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t("displayName")}</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("displayNameHint")}
                  disabled={isPending}
                  className={inputCls}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
                  <p className="text-xs text-destructive/90">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleOpenChange(false)}
                  className="cursor-pointer"
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer">
                  {isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {t("creating")}
                    </>
                  ) : (
                    t("create")
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
