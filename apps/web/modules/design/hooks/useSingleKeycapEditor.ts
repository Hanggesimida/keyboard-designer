"use client"

import { useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import {
  computeLabelAlignPatch,
  resolveTextHalfDimensionsSingle,
  type AlignH,
  type AlignV,
} from "@/modules/design/lib/keycap-inspector/align"
import { FONT_SIZE_MAX, FONT_SIZE_MIN } from "@/modules/design/lib/keycap-inspector/constants"
import type { RowedKeyDef } from "@/modules/design/lib/keycap-inspector/layout104Keys"
import {
  useDesignUIStore,
  type KeycapOverride,
} from "@/modules/design/store/designUiStore"
import { getLayoutData } from "@/modules/design/data/layouts"
import { getTextMetrics } from "@/modules/design/store/textMetricsRegistry"
import { getFontCapabilities } from "@/modules/design/components/sidebar/sections/right/font-options"

export function useSingleKeycapEditor({
  layerId,
  keyDef,
  override,
  disabled,
}: {
  layerId: string
  keyDef: RowedKeyDef
  override: KeycapOverride | undefined
  disabled?: boolean
}) {
  const templateId = useDesignUIStore((s) => s.templateId)
  const LAYOUT_BASE_UNIT = getLayoutData(templateId).baseUnit
  const setKeycapOverride = useDesignUIStore((s) => s.setKeycapOverride)
  const clearKeycapOverride = useDesignUIStore((s) => s.clearKeycapOverride)
  // 用 useShallow 只选取实际用到的字段，避免整个 globalKeycapStyle 对象变化触发重渲染
  const globalKeycapStyle = useDesignUIStore(
    useShallow((s) => ({
      fontSize: s.globalKeycapStyle.fontSize,
      labelColor: s.globalKeycapStyle.labelColor,
      color: s.globalKeycapStyle.color,
      borderColor: s.globalKeycapStyle.borderColor,
      borderHidden: s.globalKeycapStyle.borderHidden,
    })),
  )
  const globalFontFamily = useDesignUIStore((s) => s.fontFamily)

  const currentLabel = override?.labelText ?? keyDef.label
  const currentFontSize = override?.fontSize ?? globalKeycapStyle.fontSize
  const effectiveFontFamily = override?.fontFamily ?? globalFontFamily

  const [labelInput, setLabelInput] = useState(currentLabel)
  const [fontSizeInput, setFontSizeInput] = useState(String(currentFontSize))
  const [fontPopoverOpen, setFontPopoverOpen] = useState(false)

  useEffect(() => {
    setLabelInput(currentLabel)
  }, [currentLabel])

  useEffect(() => {
    setFontSizeInput(String(currentFontSize))
  }, [currentFontSize])

  const patchOverride = useCallback(
    (patch: Partial<KeycapOverride>) => {
      if (disabled) return
      setKeycapOverride(layerId, keyDef.keyId, patch)
    },
    [disabled, keyDef.keyId, layerId, setKeycapOverride],
  )

  const commitLabel = useCallback(() => {
    if (disabled) return
    if (labelInput === keyDef.label) {
      setKeycapOverride(layerId, keyDef.keyId, { labelText: undefined })
    } else {
      setKeycapOverride(layerId, keyDef.keyId, { labelText: labelInput })
    }
  }, [
    disabled,
    keyDef.label,
    labelInput,
    layerId,
    keyDef.keyId,
    setKeycapOverride,
  ])

  const commitFontSize = useCallback(
    (directValue?: string) => {
      if (disabled) return
      const parsed = Number.parseInt(directValue ?? fontSizeInput, 10)
      if (Number.isNaN(parsed)) {
        setFontSizeInput(String(currentFontSize))
        return
      }
      const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed))
      setFontSizeInput(String(clamped))
      if (clamped === globalKeycapStyle.fontSize) {
        setKeycapOverride(layerId, keyDef.keyId, { fontSize: undefined })
      } else {
        setKeycapOverride(layerId, keyDef.keyId, { fontSize: clamped })
      }
    },
    [
      currentFontSize,
      disabled,
      fontSizeInput,
      globalKeycapStyle.fontSize,
      keyDef.keyId,
      layerId,
      setKeycapOverride,
    ],
  )

  const handleLabelChange = useCallback(
    (val: string) => {
      setLabelInput(val)
      if (disabled) return
      if (val === keyDef.label) {
        setKeycapOverride(layerId, keyDef.keyId, { labelText: undefined })
      } else {
        setKeycapOverride(layerId, keyDef.keyId, { labelText: val })
      }
    },
    [disabled, keyDef.keyId, keyDef.label, layerId, setKeycapOverride],
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
        if (parsed === globalKeycapStyle.fontSize) {
          setKeycapOverride(layerId, keyDef.keyId, { fontSize: undefined })
        } else {
          setKeycapOverride(layerId, keyDef.keyId, { fontSize: parsed })
        }
      }
    },
    [
      disabled,
      globalKeycapStyle.fontSize,
      keyDef.keyId,
      layerId,
      setKeycapOverride,
    ],
  )

  const handleFontFamilyPick = useCallback(
    (family: string) => {
      const caps = getFontCapabilities(family)
      const patch: {
        fontFamily?: string
        fontWeight?: number
        fontStyle?: string
      } = {
        fontFamily: family === globalFontFamily ? undefined : family,
      }
      // 用户字体无粗/斜：强制常规，避免仍套用全局 700/italic
      if (!caps.bold) patch.fontWeight = 400
      if (!caps.italic) patch.fontStyle = "normal"
      patchOverride(patch)
      setFontPopoverOpen(false)
    },
    [globalFontFamily, patchOverride],
  )

  const handleAlign = useCallback(
    (alignH: AlignH, alignV: AlignV) => {
      if (disabled) return
      const metrics = getTextMetrics(keyDef.keyId)
      const { halfW, halfH } = resolveTextHalfDimensionsSingle(
        metrics,
        currentFontSize,
        currentLabel,
      )
      const patch = computeLabelAlignPatch(
        keyDef,
        LAYOUT_BASE_UNIT,
        alignH,
        alignV,
        halfW,
        halfH,
      )
      patchOverride(patch)
    },
    [currentFontSize, currentLabel, disabled, keyDef, patchOverride],
  )

  const hasOverride = !!override && Object.keys(override).length > 0

  const resetKeycap = useCallback(() => {
    if (disabled) return
    clearKeycapOverride(layerId, keyDef.keyId)
  }, [clearKeycapOverride, disabled, keyDef.keyId, layerId])

  return {
    currentLabel,
    labelInput,
    setLabelInput,
    handleLabelChange,
    commitLabel,
    onLabelEscape: () => setLabelInput(currentLabel),

    currentFontSize,
    fontSizeInput,
    setFontSizeInput,
    commitFontSize,
    handleFontSizeStepperChange,
    resetFontSizeInput: () => setFontSizeInput(String(currentFontSize)),

    effectiveFontFamily,
    fontPopoverOpen,
    setFontPopoverOpen,
    handleFontFamilyPick,

    globalKeycapStyle,
    handleAlign,
    patchOverride,

    hasOverride,
    resetKeycap,
  }
}
