"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import type { Address } from "@/lib/api/addresses"

export const addressSchema = z.object({
  name: z.string().min(1, "请填写收件人姓名").max(50),
  phone: z
    .string()
    .regex(/^1[3-9]\d{9}$/, "手机号格式不正确，请输入 11 位大陆手机号"),
  province: z.string().min(1, "请填写省份").max(50),
  city: z.string().min(1, "请填写城市").max(50),
  district: z.string().min(1, "请填写区/县").max(50),
  detail: z.string().min(1, "请填写详细地址").max(200),
  isDefault: z.boolean().optional(),
})

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
  const isEdit = !!editAddress

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
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
    "w-full h-9 px-3 rounded-lg border bg-white/[0.04] text-sm text-white placeholder:text-white/25 outline-none transition-colors border-white/10 hover:border-white/20 focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50"
  const labelCls = "block text-xs font-medium text-white/50 mb-1"
  const errorCls = "mt-1 text-xs text-red-400/80"

  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#141414] border border-white/[0.1] text-white max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-white/90">
            {isEdit ? "编辑收货地址" : "新增收货地址"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit ? "修改已有收货地址的收件人、联系方式与详细地址" : "填写收件人、联系方式与详细地址"}
          </DialogDescription>
          <button
            type="button"
            onClick={() => !isSubmitting && onOpenChange(false)}
            className="absolute right-4 top-4 text-white/30 hover:text-white/70 transition-colors"
          >
            <X size={16} />
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-2 space-y-4">
          <div>
            <label className={labelCls}>收件人</label>
            <input
              {...register("name")}
              placeholder="请输入收件人姓名"
              disabled={isSubmitting}
              className={inputCls}
            />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelCls}>手机号</label>
            <input
              {...register("phone")}
              placeholder="请输入手机号"
              disabled={isSubmitting}
              className={inputCls}
            />
            {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>省份</label>
              <input
                {...register("province")}
                placeholder="省"
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.province && (
                <p className={errorCls}>{errors.province.message}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>城市</label>
              <input
                {...register("city")}
                placeholder="市"
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.city && <p className={errorCls}>{errors.city.message}</p>}
            </div>
            <div>
              <label className={labelCls}>区/县</label>
              <input
                {...register("district")}
                placeholder="区/县"
                disabled={isSubmitting}
                className={inputCls}
              />
              {errors.district && (
                <p className={errorCls}>{errors.district.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>详细地址</label>
            <textarea
              {...register("detail")}
              placeholder="街道、门牌号等详细信息"
              rows={2}
              disabled={isSubmitting}
              className="w-full px-3 py-2 rounded-lg border bg-white/[0.04] text-sm text-white placeholder:text-white/25 outline-none transition-colors border-white/10 hover:border-white/20 focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50 resize-none"
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
              className="w-4 h-4 rounded border-white/20 bg-white/[0.05] accent-white cursor-pointer"
            />
            <span className="text-sm text-white/50">设为默认地址</span>
          </label>

          {submitError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/[0.08] px-3 py-2.5">
              <p className="text-xs text-red-400/90">{submitError}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-white/60 hover:bg-white/5 cursor-pointer"
            >
              取消
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
                  保存中...
                </>
              ) : (
                isEdit ? "保存修改" : "添加地址"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
