"use client"

import { useState } from "react"
import { MapPin, Plus, Check, Star, Pencil, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"
import {
  useMyAddresses,
  useCreateAddress,
  useUpdateAddress,
  useSetDefaultAddress,
} from "@/hooks/queries/addresses/useAddresses"
import type { Address } from "@/lib/api/addresses"
import { AddressFormDialog, type AddressFormValues } from "@/modules/addresses"
import { ProfileEmptyState } from "@/modules/profile"
import { resolveErrorMessage } from "@/lib/api/request"

interface AddressSelectorProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function AddressSelector({ selectedId, onSelect }: AddressSelectorProps) {
  const t = useTranslations("Checkout")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
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
            setFormError(resolveErrorMessage(err, t("saveFailed"), tErrors("sessionExpired")))
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
          setFormError(resolveErrorMessage(err, t("createAddressFailed"), tErrors("sessionExpired")))
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl border border-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(addr.id)
                  }
                }}
                className={cn(
                  "w-full cursor-pointer rounded-xl border px-4 py-3.5 text-left transition-colors",
                  isSelected
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/25"
                    : "border-border bg-muted/30 hover:bg-muted/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground/85">{addr.name}</span>
                      <span className="text-sm text-muted-foreground">{addr.phone}</span>
                      {addr.isDefault && (
                        <Badge
                          variant="outline"
                          className="h-5 gap-0.5 border-amber-400/25 px-1.5 text-[10px] text-amber-400/80"
                        >
                          <Star size={9} />
                          {tCommon("default")}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                      {addr.province}{addr.city}{addr.district} {addr.detail}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {!addr.isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDefault(addr.id)
                        }}
                        disabled={isSettingDefault}
                        title={t("setDefault")}
                        className="text-muted-foreground/55 hover:text-amber-400/70"
                      >
                        {isSettingDefault ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Star size={13} />
                        )}
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(addr)
                      }}
                      title={t("editAddress")}
                      className="text-muted-foreground/55 hover:text-foreground/70"
                    >
                      <Pencil size={13} />
                    </Button>

                    {isSelected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check size={11} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <ProfileEmptyState
          icon={MapPin}
          title={t("noAddress")}
          description={t("addAddressHint")}
        />
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={openCreate}
        className="w-full cursor-pointer border-dashed"
      >
        <Plus size={14} />
        {t("addAddress")}
      </Button>

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
