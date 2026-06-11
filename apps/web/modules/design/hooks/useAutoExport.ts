"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useDesignUIStore } from "@/modules/design/store/designUiStore"
import {
  exportArtboardPng,
  exportArtboardSvg,
  type ExportArtboardParams,
} from "@/modules/design/lib/design/exportArtboard"

type AutoExportType = "png" | "svg" | "jig"

/**
 * 读取 URL ?autoExport=png|svg|jig 参数，等待设计数据加载就绪后自动触发导出。
 * 用于管理员从后台列表一键打开设计器并自动导出。
 *
 * @param getExportParams 返回当前画板导出参数的回调（需在 DOM 渲染后才有效）
 * @param onGenerateJig 触发治具 SVG 生成的回调
 */
export function useAutoExport(
  getExportParams: () => ExportArtboardParams,
  onGenerateJig: () => Promise<void>,
) {
  const searchParams = useSearchParams()
  const autoExport = searchParams.get("autoExport") as AutoExportType | null
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    if (!autoExport) return
    if (hasTriggeredRef.current) return

    const validTypes: AutoExportType[] = ["png", "svg", "jig"]
    if (!validTypes.includes(autoExport)) return

    // 轮询等待设计数据就绪（templateId 非空），最多等待 10s
    let attempts = 0
    const maxAttempts = 100

    const timer = setInterval(async () => {
      attempts++
      const { templateId } = useDesignUIStore.getState()

      // 设计数据尚未加载
      if (!templateId) {
        if (attempts >= maxAttempts) clearInterval(timer)
        return
      }

      // 额外等待 800ms，确保 DOM（artboardRef）渲染就绪
      clearInterval(timer)
      await new Promise((resolve) => setTimeout(resolve, 800))

      if (hasTriggeredRef.current) return
      hasTriggeredRef.current = true

      try {
        if (autoExport === "png") {
          await exportArtboardPng(getExportParams())
        } else if (autoExport === "svg") {
          await exportArtboardSvg(getExportParams())
        } else if (autoExport === "jig") {
          await onGenerateJig()
        }
      } catch (err) {
        console.error("[useAutoExport] 自动导出失败:", err)
      }
    }, 100)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExport])
}
