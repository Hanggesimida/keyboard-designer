"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
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

interface RefundActionButtonProps {
  order: AdminOrder
  onError?: (message: string) => void
}

export function RefundActionButton({ order, onError }: RefundActionButtonProps) {
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
          onError?.(err instanceof Error ? err.message : "退款失败，请重试")
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
        退款
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认退款</DialogTitle>
            <DialogDescription>
              将向用户全额退款 ¥{Number(order.totalAmount).toFixed(2)}，退款将通过支付宝原路退回，此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="退款原因（可选）"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button type="button" variant="destructive" disabled={isPending} onClick={handleRefund}>
              {isPending ? "退款中..." : "确认退款"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
