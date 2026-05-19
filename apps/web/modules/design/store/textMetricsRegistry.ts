/**
 * 轻量级模块级注册表，存储各键帽 SVG 文字的测量尺寸。
 * 由 KeycapNode 在渲染后写入，由对齐操作在计算偏移量时读取。
 * 无需响应式——对齐操作仅在点击时读取一次。
 *
 * 注意：注册表只增不减，仅在 104 键布局范围内使用时不会超限。
 * 若将来支持多布局切换，应在切换时调用 clearTextMetrics() 防止内存持续增长。
 */
const _registry = new Map<string, { halfW: number; halfH: number }>()

export function registerTextMetrics(
  keyId: string,
  halfW: number,
  halfH: number,
): void {
  _registry.set(keyId, { halfW, halfH })
}

export function getTextMetrics(
  keyId: string,
): { halfW: number; halfH: number } | undefined {
  return _registry.get(keyId)
}

/** 清空所有缓存，适用于布局/模板切换场景 */
export function clearTextMetrics(): void {
  _registry.clear()
}
