import type { KeyDef } from "@/modules/design/types/design"
import type {
  GlobalKeycapStyle,
  KeycapOverride,
} from "@/modules/design/store/designUiStore"
import {
  buildGlobalDistributedColors,
  resolveKeycapBodyColor,
  resolveLayerKeycapFields,
} from "@/modules/design/lib/design/resolveKeycapAppearance"
import { keyCentersFromDefs } from "@/modules/design/lib/design/distributeGradientColors"
import {
  DEFAULT_FONT_STYLE,
  DEFAULT_FONT_WEIGHT,
  DEFAULT_LETTER_SPACING,
  DEFAULT_LINE_HEIGHT_RATIO,
} from "./mixed"

export interface CreateKeycapStyleTransferPatchInput {
  sourceKey: KeyDef
  keys: readonly KeyDef[]
  override?: KeycapOverride
  globalStyle: GlobalKeycapStyle
  globalFontFamily: string
  globalFontWeight?: number
  globalFontStyle?: string
}

/**
 * 将来源键帽当前实际呈现的样式物化为单键覆盖。
 * 这样目标键帽不会继续依赖全局样式，后续全局修改也不会改变本次复用结果。
 */
export function createKeycapStyleTransferPatch({
  sourceKey,
  keys,
  override,
  globalStyle,
  globalFontFamily,
  globalFontWeight = DEFAULT_FONT_WEIGHT,
  globalFontStyle = DEFAULT_FONT_STYLE,
}: CreateKeycapStyleTransferPatchInput): Partial<KeycapOverride> {
  const layerFields = resolveLayerKeycapFields({
    override,
    globalStyle,
    defaultLabel: sourceKey.label,
  })
  const distributedColors = buildGlobalDistributedColors(
    globalStyle.color,
    keyCentersFromDefs(keys),
  )

  return {
    color: resolveKeycapBodyColor({
      overrideColor: override?.color,
      globalColor: globalStyle.color,
      keyId: sourceKey.keyId,
      globalDistributedColors: distributedColors,
    }),
    labelColor: layerFields.labelColor,
    borderColor: layerFields.borderColor,
    borderHidden: layerFields.borderHidden,
    fontSize: override?.fontSize ?? globalStyle.fontSize,
    fontFamily: override?.fontFamily ?? globalFontFamily,
    fontWeight: override?.fontWeight ?? globalFontWeight,
    fontStyle: override?.fontStyle ?? globalFontStyle,
    letterSpacing: override?.letterSpacing ?? DEFAULT_LETTER_SPACING,
    lineHeightRatio: override?.lineHeightRatio ?? DEFAULT_LINE_HEIGHT_RATIO,
    labelOffsetX: override?.labelOffsetX ?? 0,
    labelOffsetY: override?.labelOffsetY ?? 0,
  }
}
