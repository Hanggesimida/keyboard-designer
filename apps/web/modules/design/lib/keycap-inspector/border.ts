import type { GlobalKeycapStyle, KeycapOverride } from "@/modules/design/store/designUiStore"

/** 单键在画布上是否应隐藏边框（选中高亮不受此影响） */
export function resolveEffectiveBorderHidden(
  override: KeycapOverride | undefined,
  globalStyle: GlobalKeycapStyle | undefined,
): boolean {
  if (override?.borderHidden === false) return false
  if (override?.borderHidden === true) return true
  return globalStyle?.borderHidden === true
}
