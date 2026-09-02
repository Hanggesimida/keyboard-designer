"use client"

import { useState } from "react"
import { MapPin, Pencil, Trash2, Star, Loader2, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { ProfileSection, ProfileEmptyState } from "@/modules/profile"
import { PageHeader } from "@/components/layouts/PageHeader"
import {
  useMyAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from "@/hooks/queries/addresses/useAddresses"
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
import {
  AddressFormDialog,
  type AddressFormValues,
} from "@/modules/addresses"
import { resolveErrorMessage } from "@/lib/api/request"
import type { Address } from "@/lib/api/addresses"
import { Button } from "@workspace/ui/components/button"

export default function ProfileAddressesPage() {
  const t = useTranslations("Profile.addresses")
  const tCommon = useTranslations("Common")
  const tErrors = useTranslations("Errors")
  const { data: addresses, isLoading } = useMyAddresses()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Address | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { mutate: createAddress, isPending: isCreating } = useCreateAddress()
  const { mutate: updateAddress, isPending: isUpdating } = useUpdateAddress()
  const { mutate: deleteAddress, isPending: isDeleting } = useDeleteAddress()
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
        onSuccess: () => setDialogOpen(false),
        onError: (err) => {
          setFormError(resolveErrorMessage(err, t("createFailed"), tErrors("sessionExpired")))
        },
      })
    }
  }

  function handleConfirmDelete() {
    if (!deleteTargetId) return
    setDeleteError(null)
    deleteAddress(deleteTargetId, {
      onSuccess: () => setDeleteTargetId(null),
      onError: (err) =>
        setDeleteError(resolveErrorMessage(err, t("deleteFailed"), tErrors("sessionExpired"))),
    })
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        action={
          <Button onClick={openCreate} className="w-full sm:w-auto cursor-pointer">
            <Plus size={15} />
            {t("new")}
          </Button>
        }
      />

      <ProfileSection>
        {isLoading ? (
          <AddressListSkeleton />
        ) : !addresses || addresses.length === 0 ? (
          <ProfileEmptyState
            icon={MapPin}
            title={t("empty")}
            description={t("subtitle")}
          />
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-border bg-muted/30 px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground/85">{addr.name}</span>
                      <span className="text-sm text-muted-foreground">{addr.phone}</span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400/80 border border-amber-400/25 rounded px-1.5 py-0.5">
                          <Star size={9} />
                          {tCommon("default")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground/70 leading-relaxed">
                      {addr.province}{addr.city}{addr.district} {addr.detail}
                    </p>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center shrink-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        disabled={isSettingDefault}
                        onClick={() => setDefault(addr.id)}
                        title={t("setDefault")}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground/55 hover:text-amber-400/70 border border-border hover:border-amber-400/20 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSettingDefault ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Star size={11} />
                        )}
                        {t("setDefaultShort")}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      title={t("edit")}
                      className="p-2 rounded-lg text-muted-foreground/55 hover:text-foreground/70 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(addr.id)}
                      title={t("delete")}
                      className="p-2 rounded-lg text-muted-foreground/55 hover:text-destructive/70 hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSection>

      {/* 地址表单弹窗 */}
      <AddressFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editAddress={editTarget}
        onSubmit={handleFormSubmit}
        isSubmitting={isFormSubmitting}
        submitError={formError}
      />

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null)
            setDeleteError(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-xs text-destructive/80 px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <><Loader2 size={13} className="animate-spin" /> {t("deleting")}</>
              ) : (
                t("confirmDelete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function AddressListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  )
}
