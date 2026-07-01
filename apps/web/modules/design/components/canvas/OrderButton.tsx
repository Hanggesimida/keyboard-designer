"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShoppingCart } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
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

  if (fromAdmin) return null
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
