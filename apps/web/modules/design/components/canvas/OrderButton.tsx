"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart, Send, Check } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import {
  useCreateDesign,
  useUpdateDesign,
  useSubmitDesign,
} from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import type { DesignData } from "@/lib/api/designs"
import type { ExportCanvasElement } from "@/modules/design/lib/design/exportArtboard"
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"

function extractDesignData(): DesignData {
  const {
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements,
    assetMap,
  } = useDesignUIStore.getState()

  const exportElements: ExportCanvasElement[] = canvasElements.map((el) => {
    const { assetId, ...rest } = el
    return { ...rest, src: assetMap[assetId] ?? "" }
  })

  return normalizeDesignColorFields({
    version: 1,
    templateId,
    layers,
    artboardBackground,
    fontFamily,
    fontWeight,
    fontStyle,
    globalKeycapStyle,
    layerKeycapOverrides,
    canvasElements: exportElements,
  })
}

export function OrderButton() {
  const searchParams = useSearchParams()
  const designId = searchParams.get("id")
  const fromAdmin = searchParams.get("from") === "admin"

  const accessToken = useUserStore((s) => s.accessToken)
  const accountType = useUserStore((s) => s.user?.accountType)

  if (fromAdmin) return null

  return accountType === "ENTERPRISE_SUB" ? (
    <SubmitDesignButton designId={designId} accessToken={accessToken} />
  ) : (
    <CheckoutButton designId={designId} accessToken={accessToken} />
  )
}

/** 企业子账号（设计师）：保存并提交给主账号审核，无下单/结算入口 */
function SubmitDesignButton({
  designId,
  accessToken,
}: {
  designId: string | null
  accessToken: string | null
}) {
  const [submitted, setSubmitted] = useState(false)
  const { mutate: createDesign, isPending: isCreating } = useCreateDesign()
  const { mutate: updateDesign, isPending: isUpdating } = useUpdateDesign()
  const { mutate: submitDesign, isPending: isSubmitting } = useSubmitDesign()

  const isPending = isCreating || isUpdating || isSubmitting

  function handleSubmit(e: React.MouseEvent) {
    e.stopPropagation()
    if (!accessToken || isPending) return

    if (designId) {
      updateDesign(
        { id: designId, payload: { data: extractDesignData() } },
        {
          onSuccess: () => {
            submitDesign(designId, { onSuccess: () => setSubmitted(true) })
          },
        },
      )
    } else {
      createDesign(
        {
          name: `键盘方案 ${new Date().toLocaleDateString("zh-CN")}`,
          data: extractDesignData(),
        },
        {
          onSuccess: (design) => {
            submitDesign(design.id, { onSuccess: () => setSubmitted(true) })
          },
        },
      )
    }
  }

  if (!accessToken) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title="请先登录后再提交"
        disabled
        className="text-muted-foreground/40"
      >
        <Send className="size-3.5" />
        提交
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      title="保存并提交给主账号审核"
      disabled={isPending}
      onClick={handleSubmit}
      className="hover:text-primary"
    >
      {isPending ? (
        <Spinner className="size-3.5" />
      ) : submitted ? (
        <Check className="size-3.5" />
      ) : (
        <Send className="size-3.5" />
      )}
      {isPending ? "提交中..." : submitted ? "已提交" : "提交"}
    </Button>
  )
}

/** 普通用户 / 企业主账号：保存并跳转结算 */
function CheckoutButton({
  designId,
  accessToken,
}: {
  designId: string | null
  accessToken: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)

  const { mutate: createDesign, isPending: isCreating } = useCreateDesign()
  const { mutate: updateDesign, isPending: isUpdating } = useUpdateDesign()

  const isPending = isCreating || isUpdating || isNavigating

  function handleOrderClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!accessToken || isPending) return

    if (designId) {
      setIsNavigating(true)
      updateDesign(
        { id: designId, payload: { data: extractDesignData() } },
        {
          onSuccess: () => {
            router.push(`/checkout?designId=${designId}`)
          },
          onError: () => {
            setIsNavigating(false)
          },
        },
      )
    } else {
      setIsNavigating(true)
      createDesign(
        {
          name: `键盘方案 ${new Date().toLocaleDateString('zh-CN')}`,
          data: extractDesignData(),
        },
        {
          onSuccess: (design) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set("id", design.id)
            window.history.replaceState(null, "", `/design?${params.toString()}`)
            router.push(`/checkout?designId=${design.id}`)
          },
          onError: () => {
            setIsNavigating(false)
          },
        },
      )
    }
  }

  if (!accessToken) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        title="请先登录后再下单"
        disabled
        className="text-muted-foreground/40"
      >
        <ShoppingCart className="size-3.5" />
        下单
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      title="保存并下单"
      disabled={isPending}
      onClick={handleOrderClick}
      className="hover:text-primary"
    >
      {isPending ? (
        <Spinner className="size-3.5" />
      ) : (
        <ShoppingCart className="size-3.5" />
      )}
      {isPending ? "处理中..." : "下单"}
    </Button>
  )
}
