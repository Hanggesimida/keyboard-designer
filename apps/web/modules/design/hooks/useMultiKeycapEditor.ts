"use client"

import { useCallback, useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  computeLabelAlignPatch,
  resolveTextHalfDimensionsMulti,
  type AlignH,
  type AlignV,
} from "@/modules/design/lib/keycap-inspector/align"
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/modules/design/lib/keycap-inspector/constants"
import { useLayoutKeys } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import {
  getMixedColorField,
  getMixedFontFamily,
  getMixedFontSize,
} from "@/modules/design/lib/keycap-inspector/mixed"
import { getFontCapabilities } from "@/modules/design/components/sidebar/sections/right/font-options"
import {
  useDesignUIStore,
  type KeycapOverride,
} from "@/modules/design/store/designUiStore"
import { parseCssLinearGradient } from "@/modules/design/lib/design/gradientUtils"
import { distributeGradientColors } from "@/modules/design/lib/design/distributeGradientColors"
import { getTextMetrics } from "@/modules/design/store/textMetricsRegistry"
import { useSyncedState } from "@/hooks/useSyncedState"

export function useMultiKeycapEditor({
  selectedIds,
  layerId,
  layerOverrides,
  disabled,
}: {
  selectedIds: string[]
  layerId: string
  layerOverrides: Record<string, KeycapOverride>
  disabled?: boolean
}) {
  const { keysById: KEYS_BY_ID, baseUnit: LAYOUT_BASE_UNIT } = useLayoutKeys()
  const setMultipleKeycapOverrides = useDesignUIStore(
    (s) => s.setMultipleKeycapOverrides,
  )
  const clearMultipleKeycapOverrides = useDesignUIStore(
    (s) => s.clearMultipleKeycapOverrides,
  )
  const batchSetKeycapOverrides = useDesignUIStore(
    (s) => s.batchSetKeycapOverrides,
  )
  // 用 useShallow 只选取实际用到的字段，任意其他全局样式字段变化不触发重渲染
  const globalKeycapStyle = useDesignUIStore(
    useShallow((s) => ({
      labelColor: s.globalKeycapStyle.labelColor,
      color: s.globalKeycapStyle.color,
      borderColor: s.globalKeycapStyle.borderColor,
      borderHidden: s.globalKeycapStyle.borderHidden,
      fontSize: s.globalKeycapStyle.fontSize,
    })),
  )
  const globalFontFamily = useDesignUIStore((s) => s.fontFamily)

  // 用 useMemo 缓存 O(n) 的混合值计算，仅在依赖变化时重算
  const { labelColor, color, borderColor, fontSize, fontFamily } = useMemo(
    () => ({
      labelColor: getMixedColorField(selectedIds, layerOverrides, globalKeycapStyle, "labelColor", "labelColor"),
      color: getMixedColorField(selectedIds, layerOverrides, globalKeycapStyle, "color", "color"),
      borderColor: getMixedColorField(selectedIds, layerOverrides, globalKeycapStyle, "borderColor", "borderColor"),
      fontSize: getMixedFontSize(selectedIds, layerOverrides, globalKeycapStyle),
      fontFamily: getMixedFontFamily(selectedIds, layerOverrides, globalFontFamily),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, layerOverrides, globalKeycapStyle.labelColor, globalKeycapStyle.color,
     globalKeycapStyle.borderColor, globalKeycapStyle.fontSize,
     globalKeycapStyle.borderHidden, globalFontFamily],
  )

  const [fontSizeInput, setFontSizeInput] = useSyncedState(String(fontSize.value))
  const [fontPopoverOpen, setFontPopoverOpen] = useState(false)

  const hasAnyOverride = selectedIds.some(
    (id) => layerOverrides[id] && Object.keys(layerOverrides[id]!).length > 0,
  )

  const applyPatch = useCallback(
    (patch: Partial<KeycapOverride>) => {
      if (disabled) return
      setMultipleKeycapOverrides(layerId, selectedIds, patch)
    },
    [disabled, layerId, selectedIds, setMultipleKeycapOverrides],
  )

  /**
   * 将渐变"扩展"到整个选区：根据每个键帽中心在选区包围盒内沿渐变方向的位置，
   * 从渐变里采样出各自对应的纯色，实现跨键帽的统一渐变效果。
   */
  const applyGradientAcrossSelection = useCallback(
    (gradientCSS: string, field: "color") => {
      if (disabled) return
      const parsed = parseCssLinearGradient(gradientCSS)
      if (!parsed) {
        setMultipleKeycapOverrides(layerId, selectedIds, { [field]: gradientCSS })
        return
      }

      const centers: Array<{ id: string; cx: number; cy: number }> = []
      for (const keyId of selectedIds) {
        const keyDef = KEYS_BY_ID.get(keyId)
        if (!keyDef) continue
        centers.push({
          id: keyId,
          cx: keyDef.x + keyDef.w / 2,
          cy: keyDef.y + keyDef.h / 2,
        })
      }
      if (centers.length === 0) return

      const colors = distributeGradientColors(parsed, centers)
      const batchOverrides: Record<string, Partial<KeycapOverride>> = {}
      for (const [id, hex] of Object.entries(colors)) {
        batchOverrides[id] = { [field]: hex }
      }
      batchSetKeycapOverrides(layerId, batchOverrides)
    },
    [
      disabled,
      layerId,
      selectedIds,
      KEYS_BY_ID,
      setMultipleKeycapOverrides,
      batchSetKeycapOverrides,
    ],
  )

  const handleAlignMulti = useCallback(
    (alignH: AlignH, alignV: AlignV) => {
      if (disabled) return
      const batchOverrides: Record<string, Partial<KeycapOverride>> = {}
      for (const keyId of selectedIds) {
        const keyDef = KEYS_BY_ID.get(keyId)
        if (!keyDef) continue
        const metrics = getTextMetrics(keyId)
        const ov = layerOverrides[keyId]
        const fs = ov?.fontSize ?? globalKeycapStyle.fontSize  // globalKeycapStyle.fontSize 已由 useShallow 选取
        const { halfW, halfH } = resolveTextHalfDimensionsMulti(metrics, fs)
        const patch = computeLabelAlignPatch(
          keyDef,
          LAYOUT_BASE_UNIT,
          alignH,
          alignV,
          halfW,
          halfH,
        )
        batchOverrides[keyId] = patch
      }
      batchSetKeycapOverrides(layerId, batchOverrides)
    },
    [
      LAYOUT_BASE_UNIT,
      KEYS_BY_ID,
      batchSetKeycapOverrides,
      disabled,
      globalKeycapStyle.fontSize,
      layerId,
      layerOverrides,
      selectedIds,
    ],
  )

  const commitFontSize = useCallback(
    (directValue?: string) => {
      if (disabled) return
      const parsed = Number.parseInt(directValue ?? fontSizeInput, 10)
      if (Number.isNaN(parsed)) {
        setFontSizeInput(String(fontSize.value))
        return
      }
      const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed))
      setFontSizeInput(String(clamped))
      applyPatch({ fontSize: clamped })
    },
    [applyPatch, disabled, fontSize.value, fontSizeInput, setFontSizeInput],
  )

  const handleFontSizeStepperChange = useCallback(
    (value: string) => {
      setFontSizeInput(value)
      if (disabled) return
      const parsed = Number.parseInt(value, 10)
      if (
        !Number.isNaN(parsed) &&
        parsed >= FONT_SIZE_MIN &&
        parsed <= FONT_SIZE_MAX
      ) {
        applyPatch({ fontSize: parsed })
      }
    },
    [applyPatch, disabled, setFontSizeInput],
  )

  const handleFontFamilyPick = useCallback(
    (family: string) => {
      const caps = getFontCapabilities(family)
      const patch: KeycapOverride = {
        fontFamily: family === globalFontFamily ? undefined : family,
      }
      if (!caps.bold) patch.fontWeight = 400
      if (!caps.italic) patch.fontStyle = "normal"
      applyPatch(patch)
      setFontPopoverOpen(false)
    },
    [applyPatch, globalFontFamily],
  )

  const resetSelection = useCallback(() => {
    if (disabled) return
    clearMultipleKeycapOverrides(layerId, selectedIds)
  }, [clearMultipleKeycapOverrides, disabled, layerId, selectedIds])

  return {
    globalKeycapStyle,
    globalFontFamily,

    labelColor,
    color,
    borderColor,
    fontSize,
    fontFamily,

    fontSizeInput,
    setFontSizeInput,
    commitFontSize,
    handleFontSizeStepperChange,
    resetFontSizeInput: () => setFontSizeInput(String(fontSize.value)),

    fontPopoverOpen,
    setFontPopoverOpen,
    handleFontFamilyPick,

    applyPatch,
    applyGradientAcrossSelection,
    handleAlignMulti,

    hasAnyOverride,
    resetSelection,
  }
}
