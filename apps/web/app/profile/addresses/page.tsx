"use client"

import { useState } from "react"
import { MapPin, Pencil, Trash2, Star, Loader2 } from "lucide-react"
import { ProfileSection, ProfileEmptyState } from "@/modules/profile"
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
import { ApiError } from "@/lib/api/request"
import type { Address } from "@/lib/api/addresses"

export default function ProfileAddressesPage() {
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
            setFormError(err instanceof ApiError ? err.message : "保存失败，请重试")
          },
        },
      )
    } else {
      createAddress(values, {
        onSuccess: () => setDialogOpen(false),
        onError: (err) => {
          setFormError(err instanceof ApiError ? err.message : "创建失败，请重试")
        },
      })
    }
  }

  function handleConfirmDelete() {
    if (!deleteTargetId) return
    setDeleteError(null)
    deleteAddress(deleteTargetId, {
      onSuccess: () => setDeleteTargetId(null),
      onError: () => setDeleteError("删除失败，请稍后重试"),
    })
  }

  return (
    <>
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-foreground">收货地址</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理你的收货地址，下单时可快速选择。
        </p>
      </div>

      <ProfileSection>
        {isLoading ? (
          <AddressListSkeleton />
        ) : !addresses || addresses.length === 0 ? (
          <ProfileEmptyState
            icon={MapPin}
            title="还没有收货地址"
            description="添加收货地址，下单时可快速选择。"
          />
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5"
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

                  {/* 操作 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        disabled={isSettingDefault}
                        onClick={() => setDefault(addr.id)}
                        title="设为默认地址"
                        className="flex items-center gap-1 text-[11px] text-white/30 hover:text-amber-400/70 border border-white/[0.07] hover:border-amber-400/20 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSettingDefault ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <Star size={11} />
                        )}
                        设为默认
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEdit(addr)}
                      title="编辑地址"
                      className="p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-colors cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(addr.id)}
                      title="删除地址"
                      className="p-2 rounded-lg text-white/30 hover:text-red-400/70 hover:bg-red-400/[0.07] transition-colors cursor-pointer"
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
        <AlertDialogContent className="bg-[#1a1a1a] border border-white/[0.1] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除地址？</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              删除后该地址将无法恢复，请确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p className="text-xs text-red-400/80 px-1">{deleteError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white/60 hover:bg-white/5">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <><Loader2 size={13} className="animate-spin" /> 删除中...</>
              ) : (
                "确认删除"
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
          className="h-20 rounded-xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
        />
      ))}
    </div>
  )
}
