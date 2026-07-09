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
import { useCreateSubAccount } from "@/hooks/queries/enterprise/useEnterprise"
import type { CreateSubAccountResult } from "@/lib/api/enterprise"
import { ApiError } from "@/lib/api/request"

interface CreateSubAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSubAccountDialog({
  open,
  onOpenChange,
}: CreateSubAccountDialogProps) {
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
          setError(err instanceof ApiError ? err.message : "创建失败，请重试")
        },
      },
    )
  }

  function handleCopy() {
    if (!created) return
    navigator.clipboard
      .writeText(`邮箱：${created.email}\n初始密码：${created.initialPassword}`)
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
              <DialogTitle>子账号已创建</DialogTitle>
              <DialogDescription>
                请将以下登录信息转告设计师，密码仅在此展示一次，请妥善保存。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground">邮箱</p>
                <p className="font-mono text-sm text-foreground">{created.email}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">初始密码</p>
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
              <DialogTitle>新增子账号</DialogTitle>
              <DialogDescription>
                子账号（设计师）可独立登录、设计并提交方案，等待你审核下单。
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div>
                <label className={labelCls}>登录邮箱</label>
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
                <label className={labelCls}>显示名称</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="用于团队内部展示的名称"
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
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer">
                  {isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建子账号"
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
