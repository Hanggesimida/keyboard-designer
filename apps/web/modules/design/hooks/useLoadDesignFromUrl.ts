"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { getDesign } from "@/lib/api/designs"
import { useUserStore } from "@/store/userStore"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import type { DesignData } from "@/lib/api/designs"
import type { CanvasElement } from "@/modules/design/store/designUiStore"
import { parseUserFontId } from "@/lib/fonts/fontRef"
import { resolveAndCacheUserFonts } from "@/hooks/queries/fonts/useFonts"
import { normalizeDesignColorFields } from "@/modules/design/lib/design/normalizeKeycapColors"

/**
 * 将后端持久化格式（内联 src）转换为运行时格式（assetId + assetMap），
 * 并将设计数据应用到 designUiStore。
 */
function applyDesignData(data: DesignData) {
  const normalized = normalizeDesignColorFields(data)
  const assetMap: Record<string, string> = {}

  const canvasElements: CanvasElement[] = normalized.canvasElements.map((el) => {
    const src = el.src ?? ""
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    if (src) assetMap[assetId] = src
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { src: _src, ...rest } = el
    return { ...rest, assetId } as CanvasElement
  })

  useDesignUIStore.setState({
    templateId: normalized.templateId,
    layers: normalized.layers,
    artboardBackground: normalized.artboardBackground,
    fontFamily: normalized.fontFamily ?? "var(--font-ibm-plex-mono)",
    fontWeight: normalized.fontWeight ?? 400,
    fontStyle: normalized.fontStyle ?? "normal",
    globalKeycapStyle: normalized.globalKeycapStyle,
    layerKeycapOverrides: normalized.layerKeycapOverrides,
    canvasElements,
    assetMap,
    selectedKeycapIds: [],
    selectedElementId: null,
    activeLayerId: null,
    keycapEditTarget: null,
    liveDragOverrides: {},
  })

  // 加载后清空撤销历史，避免"撤销"到加载前的空状态
  useDesignUIStore.temporal.getState().clear()
}

function collectUserFontIds(data: DesignData): string[] {
  const ids = new Set<string>()
  const push = (ref?: string) => {
    const id = ref ? parseUserFontId(ref) : null
    if (id) ids.add(id)
  }
  push(data.fontFamily)
  for (const layerMap of Object.values(data.layerKeycapOverrides ?? {})) {
    for (const ov of Object.values(layerMap ?? {})) {
      push(ov.fontFamily)
    }
  }
  return [...ids]
}

/**
 * 读取 URL query `?id=xxx`：
 * - 若存在 id，则从后端加载对应设计数据并应用到 store（只触发一次）；
 * - 若不存在 id（全新设计），则在挂载时重置 store 为初始状态；
 * - 组件卸载时始终重置 store，防止状态残留影响下次进入。
 */
export function useLoadDesignFromUrl() {
  const searchParams = useSearchParams()
  const designId = searchParams.get("id")
  const accessToken = useUserStore((s) => s.accessToken)
  const loadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    // 无 id 参数时为全新设计，立即重置全局状态
    if (!designId) {
      useDesignUIStore.getState().resetAll()
      useDesignUIStore.temporal.getState().clear()
      loadedIdRef.current = null
      return
    }

    if (!accessToken) return
    // 避免同一个 id 重复加载
    if (loadedIdRef.current === designId) return

    loadedIdRef.current = designId

    getDesign(designId)
      .then(async (design) => {
        applyDesignData(design.data)
        const fontIds = collectUserFontIds(design.data)
        if (fontIds.length > 0) {
          try {
            await resolveAndCacheUserFonts(fontIds)
          } catch (err) {
            console.warn("[useLoadDesignFromUrl] 用户字体解析失败:", err)
          }
        }
      })
      .catch((err) => {
        console.error("[useLoadDesignFromUrl] 加载设计失败:", err)
      })
  }, [designId, accessToken])

  // 离开设计页面时重置全局状态，避免残留数据影响下次进入
  useEffect(() => {
    return () => {
      useDesignUIStore.getState().resetAll()
      useDesignUIStore.temporal.getState().clear()
    }
  }, [])
}
