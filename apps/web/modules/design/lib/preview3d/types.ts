import type { KeyShape, KeySection } from "@/modules/design/types/design"

/** 与 React / Zustand / Three 无关的单键预览数据 */
export interface PreviewKey {
  id: string
  label: string
  shape: KeyShape
  section: KeySection
  rowLevel?: string
  /** Three 世界坐标：键帽底面中心 [x, y, z]（y ≈ 0 贴地） */
  position: [number, number, number]
  /**
   * 键帽在 XZ 平面上的可视尺寸（世界单位，已扣 gap）。
   * `[widthX, depthZ]`；高度由渲染层使用占位/模型常量。
   */
  sizeU: [number, number]
  /** 命中尺寸族时的 GLB 路径；未命中则走占位兜底 */
  modelPath?: string
  /** 整颗键帽本体色（纯色 hex，已做渐变降级与多层合成） */
  color: string
  labelColor: string
  /** Phase 4：最顶可见层是否隐藏标签 */
  labelsHidden: boolean
  selected: boolean
  visible: boolean
}

export interface PreviewSceneBounds {
  min: [number, number, number]
  max: [number, number, number]
  center: [number, number, number]
  /** XZ 平面宽度（世界单位） */
  width: number
  /** XZ 平面深度（世界单位） */
  depth: number
}

/** 渲染层只消费此模型，不直接读 layout JSON / store */
export interface PreviewSceneModel {
  templateId: string
  baseUnit: number
  keys: PreviewKey[]
  bounds: PreviewSceneBounds
  /** 几何/外观/选择态变化标记 */
  revision: string
}

/** buildPreviewSceneModel 所需的设计状态快照（纯数据，非 Zustand） */
export interface PreviewDesignStateInput {
  templateId: string
  globalKeycapStyle: {
    color: string
    labelColor: string
    borderColor: string
    borderHidden: boolean
  }
  layers: ReadonlyArray<{
    id: string
    visible: boolean
    opacity: number
    labelsHidden?: boolean
  }>
  activeLayerId: string | null
  layerKeycapOverrides: Readonly<
    Record<
      string,
      Record<
        string,
        {
          color?: string
          labelColor?: string
          labelText?: string
          borderColor?: string
          borderHidden?: boolean
        }
      >
    >
  >
  selectedKeycapIds: ReadonlyArray<string>
}
