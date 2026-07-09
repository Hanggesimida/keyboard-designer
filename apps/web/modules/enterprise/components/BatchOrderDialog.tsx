"use client"

import { useEffect, useState } from "react"
import { Loader2, PackageCheck, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Button } from "@workspace/ui/components/button"
import { QuantitySelector } from "@/modules/checkout/components/QuantitySelector"
import { useMyAddresses } from "@/hooks/queries/addresses/useAddresses"
import { useBatchCreateOrder } from "@/hooks/queries/enterprise/useEnterprise"
import type { TeamDesignSummary } from "@/lib/api/enterprise"
import type { BatchCreateOrderResult } from "@/lib/api/orders"

interface BatchOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designs: TeamDesignSummary[]
  onCompleted?: () => void
}

export function BatchOrderDialog({
  open,
  onOpenChange,
  designs,
  onCompleted,
}: BatchOrderDialogProps) {
  const { data: addresses } = useMyAddresses()
  const { mutate: batchCreateOrder, isPending } = useBatchCreateOrder()

  // designId → addressId / quantity
  const [addressByDesign, setAddressByDesign] = useState<Record<string, string>>({})
  const [quantityByDesign, setQuantityByDesign] = useState<Record<string, number>>({})
  const [result, setResult] = useState<BatchCreateOrderResult | null>(null)

  const defaultAddressId =
    addresses?.find((a) => a.isDefault)?.id ?? addresses?.[0]?.id ?? ""

  useEffect(() => {
    if (!open) return
    setResult(null)
    const initialAddresses: Record<string, string> = {}
    const initialQuantities: Record<string, number> = {}
    for (const design of designs) {
      initialAddresses[design.id] = defaultAddressId
      initialQuantities[design.id] = 1
    }
    setAddressByDesign(initialAddresses)
    setQuantityByDesign(initialQuantities)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, designs.map((d) => d.id).join(","), defaultAddressId])

  function handleOpenChange(next: boolean) {
    if (!isPending) onOpenChange(next)
    if (!next && result) onCompleted?.()
  }

  function applyToAll(addressId: string) {
    setAddressByDesign((prev) => {
      const next = { ...prev }
      for (const design of designs) next[design.id] = addressId
      return next
    })
  }

  function applyQuantityToAll(quantity: number) {
    setQuantityByDesign((prev) => {
      const next = { ...prev }
      for (const design of designs) next[design.id] = quantity
      return next
    })
  }

  function handleSubmit() {
    const items = designs.map((design) => ({
      designId: design.id,
      addressId: addressByDesign[design.id]!,
      quantity: quantityByDesign[design.id] ?? 1,
    }))

    batchCreateOrder({ items }, { onSuccess: (res) => setResult(res) })
  }

  const allAssigned = designs.every((d) => !!addressByDesign[d.id])
  const hasAddresses = !!addresses && addresses.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-2xl">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>批量下单完成</DialogTitle>
              <DialogDescription>
                成功 {result.success.length} 个，失败 {result.failed.length} 个。
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {result.success.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                  <span className="truncate">
                    {order.design.name} · {order.quantity} 套 · {order.orderNo}
                  </span>
                </div>
              ))}
              {result.failed.map((item) => {
                const design = designs.find((d) => d.id === item.designId)
                return (
                  <div
                    key={item.designId}
                    className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
                  >
                    <AlertTriangle size={14} className="shrink-0 text-destructive/70" />
                    <span className="truncate">
                      {design?.name ?? item.designId}：{item.reason}
                    </span>
                  </div>
                )
              })}
            </div>

            <DialogFooter>
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
              <DialogTitle>批量下单</DialogTitle>
              <DialogDescription>
                已选 {designs.length} 个设计，为每个设计选择收货地址后确认下单（月结免支付）。
              </DialogDescription>
            </DialogHeader>

            {!hasAddresses ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                暂无收货地址，请先在地址管理中添加地址。
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">批量设置数量</span>
                  <QuantitySelector
                    value={quantityByDesign[designs[0]?.id ?? ""] ?? 1}
                    onChange={applyQuantityToAll}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">批量设置收货地址</span>
                  <Select onValueChange={applyToAll}>
                    <SelectTrigger size="sm" className="w-44">
                      <SelectValue placeholder="选择地址应用到全部" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.name} · {addr.detail}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {designs.map((design) => (
                    <div
                      key={design.id}
                      className="space-y-2.5 rounded-lg border border-border px-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium leading-snug text-foreground/85">
                          {design.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/60">
                          {design.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <QuantitySelector
                          value={quantityByDesign[design.id] ?? 1}
                          onChange={(value) =>
                            setQuantityByDesign((prev) => ({ ...prev, [design.id]: value }))
                          }
                        />
                        <Select
                          value={addressByDesign[design.id] ?? ""}
                          onValueChange={(value) =>
                            setAddressByDesign((prev) => ({ ...prev, [design.id]: value }))
                          }
                        >
                          <SelectTrigger size="sm" className="min-w-0 flex-1">
                            <SelectValue placeholder="选择地址" />
                          </SelectTrigger>
                          <SelectContent>
                            {addresses.map((addr) => (
                              <SelectItem key={addr.id} value={addr.id}>
                                {addr.name} · {addr.detail}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </>
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
                disabled={isPending || !allAssigned || !hasAddresses}
                onClick={handleSubmit}
                className="cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    下单中...
                  </>
                ) : (
                  <>
                    <PackageCheck size={14} />
                    确认批量下单
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
