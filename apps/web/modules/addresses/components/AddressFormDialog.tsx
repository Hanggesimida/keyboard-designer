"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import type { Address } from "@/lib/api/addresses"

type Translate = (
  key:
    | "recipientRequired"
    | "phoneInvalid"
    | "provinceRequired"
    | "cityRequired"
    | "districtRequired"
    | "detailRequired",
) => string

export function createAddressSchema(t: Translate) {
  return z.object({
    name: z.string().min(1, { error: t("recipientRequired") }).max(50),
    phone: z.string().regex(/^1[3-9]\d{9}$/, { error: t("phoneInvalid") }),
    province: z.string().min(1, { error: t("provinceRequired") }).max(50),
    city: z.string().min(1, { error: t("cityRequired") }).max(50),
    district: z.string().min(1, { error: t("districtRequired") }).max(50),
    detail: z.string().min(1, { error: t("detailRequired") }).max(200),
    isDefault: z.boolean().optional(),
  })
}

export const addressSchema = createAddressSchema((key) => key)

export type AddressFormValues = z.infer<typeof addressSchema>

interface AddressFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editAddress?: Address | null
  onSubmit: (values: AddressFormValues) => void
  isSubmitting: boolean
  submitError: string | null
}

export function AddressFormDialog({
  open,
  onOpenChange,
  editAddress,
  onSubmit,
  isSubmitting,
  submitError,
}: AddressFormDialogProps) {
  const t = useTranslations("AddressForm")
  const tVal = useTranslations("Validation")
  const tCommon = useTranslations("Common")
  const isEdit = !!editAddress
  const schema = useMemo(() => createAddressSchema(tVal), [tVal])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      if (editAddress) {
        reset({
          name: editAddress.name,
          phone: editAddress.phone,
          province: editAddress.province,
          city: editAddress.city,
          district: editAddress.district,
          detail: editAddress.detail,
          isDefault: editAddress.isDefault,
        })
      } else {
        reset({
          name: "",
          phone: "",
          province: "",
          city: "",
          district: "",
          detail: "",
          isDefault: false,
        })
      }
    }
  }, [open, editAddress, reset])

  const inputCls =
    "w-full h-9 px-3 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/45 outline-none transition-colors hover:border-border focus:border-ring focus:bg-muted/50 disabled:opacity-50"
  const labelCls = "block text-xs font-medium text-muted-foreground mb-1"
  const errorCls = "mt-1 text-xs text-destructive/80"

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {isEdit ? t("editTitle") : t("addTitle")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("subtitle")}
          </DialogDescription>
          <button
            type="button"
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="absolute right-4 top-4 text-muted-foreground/55 hover:text-foreground/70 transition-colors"
          >
            <X size={16} />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div>
            <label className={labelCls}>{t("recipient")}</label>
            <input
              {...register("name")}
              placeholder={t("recipientPh")}
              disabled={isSubmitting}
              className={inputCls}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelCls}>{t("phone")}</label>
            <input
              {...register("phone")}
              placeholder={t("phonePh")}
              disabled={isSubmitting}
              className={inputCls}
            />
            {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>{t("province")}</label>
              <input
                {...register("province")}
                placeholder={t("provincePh")}
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.province && (
                <p className={errorCls}>{errors.province.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>{t("city")}</label>
              <input
                {...register("city")}
                placeholder={t("cityPh")}
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.city && <p className={errorCls}>{errors.city.message}</p>}
            </div>
            <div>
              <label className={labelCls}>{t("district")}</label>
              <input
                {...register("district")}
                placeholder={t("districtPh")}
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.district && (
                <p className={errorCls}>{errors.district.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>{t("detail")}</label>
            <textarea
              {...register("detail")}
              placeholder={t("detailPh")}
              rows={2}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm text-foreground placeholder:text-muted-foreground/45 outline-none transition-colors hover:border-border focus:border-ring focus:bg-muted/50 disabled:opacity-50 resize-none"
            />
            {errors.detail && (
              <p className={errorCls}>{errors.detail.message}</p>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register("isDefault")}
              disabled={isSubmitting}
              className="w-4 h-4 rounded border-border bg-muted/50 accent-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{t("setDefault")}</span>
          </label>

          {submitError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5">
              <p className="text-xs text-destructive/90">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t("saving")}
                </>
              ) : (
                isEdit ? t("save") : t("add")
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
