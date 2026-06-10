"use client"

import { useState } from "react"
import { MapPin, Plus, Check, Star, Pencil, Loader2 } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  useMyAddresses,
  useCreateAddress,
  useUpdateAddress,
  useSetDefaultAddress,
} from "@/hooks/queries/addresses/useAddresses"
import type { Address } from "@/lib/api/addresses"
import { AddressFormDialog, type AddressFormValues } from "./AddressFormDialog"
import { ApiError } from "@/lib/api/request"

interface AddressSelectorProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AddressSelector({ selectedId, onSelect }: AddressSelectorProps) {
  const { data: addresses, isLoading } = useMyAddresses()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Address | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate: createAddress, isPending: isCreating } = useCreateAddress()
  const { mutate: updateAddress, isPending: isUpdating } = useUpdateAddress()
  const { mutate: setDefault, isPending: isSettingDefault } = useSetDefaultAddress()

  const isFormSubmitting = isCreating || isUpdating

  function openCreate() {
    setEditTarget(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(addr: Address) {
    setEditTarget(addr)
    setFormError(null)
    setDialogOpen(true)
  }

  function handleFormSubmit(values: AddressFormValues) {
    setFormError(null)
    if (editTarget) {
      updateAddress(
        { id: editTarget.id, payload: values },
        {
          onSuccess: () => setDialogOpen(false),
          onError: (err) => {
            setFormError(err instanceof ApiError ? err.message : "保存失败，请重试")
          },
        },
      )
    } else {
      createAddress(values, {
        onSuccess: (addr) => {
          setDialogOpen(false)
          onSelect(addr.id)
        },
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : "创建失败，请重试")
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 地址列表 */}
      {addresses && addresses.length > 0 ? (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const isSelected = selectedId === addr.id
            return (
              <div
                key={addr.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(addr.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(addr.id) } }}
                className={[
                  "w-full text-left rounded-xl border px-4 py-3.5 transition-colors cursor-pointer",
                  isSelected
                    ? "border-white/30 bg-white/[0.06]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white/85">{addr.name}</span>
                      <span className="text-sm text-white/50">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400/80 border border-amber-400/25 rounded px-1.5 py-0.5">
                          <Star size={9} />
                          默认
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/40 leading-relaxed">
                      {addr.province}{addr.city}{addr.district} {addr.detail}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* 编辑 */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(addr) }}
                      className="p-1 rounded text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      title="编辑地址"
                    >
                      <Pencil size={13} />
                    </button>

                    {/* 设为默认 */}
                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDefault(addr.id) }}
                        disabled={isSettingDefault}
                        className="p-1 rounded text-white/25 hover:text-amber-400/60 hover:bg-amber-400/[0.06] transition-colors disabled:opacity-40"
                        title="设为默认"
                      >
                        {isSettingDefault ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Star size={13} />
                        )}
                      </button>
                    )}

                    {/* 已选中勾 */}
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                        <Check size={11} className="text-black" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 rounded-xl border border-white/[0.06] bg-white/[0.01]">
          <MapPin size={28} className="text-white/20" />
          <p className="text-sm text-white/35">还没有收货地址</p>
        </div>
      )}

      {/* 新增地址按钮 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openCreate}
        className="w-full border-dashed border-white/15 text-white/45 hover:border-white/30 hover:text-white/70 hover:bg-white/[0.03] cursor-pointer"
      >
        <Plus size={14} />
        新增收货地址
      </Button>

      {/* 地址表单弹窗 */}
      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editAddress={editTarget}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
        submitError={formError}
      />
    </div>
  )
}
