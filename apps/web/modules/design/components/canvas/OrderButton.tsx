"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { Spinner } from "@workspace/ui/components/spinner"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import { useCreateDesign, useUpdateDesign } from "@/hooks/queries/designs/useDesigns"
import { useUserStore } from "@/store/userStore"
import type { DesignData } from "@/lib/api/designs"
import type { ExportCanvasElement } from "@/modules/design/lib/design/exportArtboard"

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

  return {
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
  }
}

export function OrderButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const designId = searchParams.get("id")
  const fromAdmin = searchParams.get("from") === "admin"

  const accessToken = useUserStore((s) => s.accessToken)

  // 管理员审阅模式不显示下单按钮
  if (fromAdmin) return null
  const [isNavigating, setIsNavigating] = useState(false)

  const { mutate: createDesign, isPending: isCreating } = useCreateDesign()
  const { mutate: updateDesign, isPending: isUpdating } = useUpdateDesign()

  const isPending = isCreating || isUpdating || isNavigating

  function handleOrderClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!accessToken || isPending) return

    if (designId) {
      // 先保存最新设计，然后跳转
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
      // 未保存：先创建设计记录，将 id 写回 URL，再跳转结算页
      // 写回 URL 后从 checkout 返回时会加载已保存的设计，而非重置为空
      setIsNavigating(true)
      createDesign(
        {
          name: `键盘方案 ${new Date().toLocaleDateString('zh-CN')}`,
          data: extractDesignData(),
        },
        {
          onSuccess: (design) => {
            // 先同步更新地址栏（不产生新历史记录），让"返回"能落到正确的设计页
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
      <button
        type="button"
        title="请先登录后再下单"
        disabled
        className="flex cursor-not-allowed items-center justify-center gap-1 rounded px-1 py-0.5 text-white/20"
      >
        <ShoppingCart className="size-3.5" />
        <span className="text-[11px] leading-none">下单</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      title="保存并下单"
      disabled={isPending}
      onClick={handleOrderClick}
      className="flex cursor-pointer items-center justify-center gap-1 rounded px-1 py-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 text-white/40 hover:bg-white/10 hover:text-amber-400/80"
    >
      {isPending ? (
        <Spinner className="size-3.5" />
      ) : (
        <ShoppingCart className="size-3.5" />
      )}
      <span className="text-[11px] leading-none">
        {isPending ? "处理中..." : "下单"}
      </span>
    </button>
  )
}
