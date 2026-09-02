"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { canRefundOrder, type AdminOrder } from "@/lib/api/admin-orders"
import { useRefundOrder } from "@/hooks/queries/admin/useAdminOrders"
import { resolveErrorMessage } from "@/lib/api/request"

interface RefundActionButtonProps {
  order: AdminOrder
  onError?: (message: string) => void
}

export function RefundActionButton({ order, onError }: RefundActionButtonProps) {
  const t = useTranslations("Admin.actions")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const { mutate: refund, isPending } = useRefundOrder()

  if (!canRefundOrder(order)) {
    return null
  }

  function handleRefund() {
    refund(
      { id: order.id, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false)
          setReason("")
        },
        onError: (err) => {
          onError?.(resolveErrorMessage(err, t("refundFailed"), tErrors("sessionExpired")))
        },
      },
    )
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-amber-500/[0.1] hover:bg-amber-500/[0.15] text-amber-400/80 border-amber-500/[0.2] w-full sm:w-auto"
      >
        {isPending && <Loader2 size={12} className="animate-spin" />}
        {t("refund")}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmRefund")}</DialogTitle>
            <DialogDescription>
              {t("refundBody")} ¥{Number(order.totalAmount).toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("refundReason")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={handleRefund}>
              {isPending ? t("refunding") : t("confirmRefund")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
