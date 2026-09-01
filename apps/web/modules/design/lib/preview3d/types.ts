import type { KeyShape, KeySection } from "@/modules/design/types/design"
import type { PreviewImageDecal } from "./imageDecal"

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
  /** 最顶可见层是否隐藏标签（图集烘焙按层处理；此字段供调试/选择态） */
  labelsHidden: boolean
  selected: boolean
  visible: boolean
  /** 当前全局贴花是否作用于此键（与 2D clip 相交一致） */
  decalEnabled: boolean
}

/** 图集中单条刻字（SVG 坐标，与 KeycapNode 一致） */
export interface LegendDrawItem {
  keyId: string
  layerId: string
  lines: readonly string[]
  color: string
  opacity: number
  fontSize: number
  /** store 字体引用：`var(--font-xxx)` 或 `uf:{id}` */
  fontFamily: string
  fontWeight: number
  fontStyle: string
  letterSpacing: number
  lineHeight: number
  textX: number
  textYDraw: number
}

/** 整盘刻字图集：烘焙输入 + 世界采样矩阵 */
export interface LegendAtlasSpec {
  items: readonly LegendDrawItem[]
  svgWidth: number
  svgHeight: number
  matrixElements: PreviewImageDecal["matrixElements"]
  revision: string
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
  /**
   * 当前布局未命中的期望 GLB 文件名（去重排序）。
   * 空数组表示全部有真模。
   */
  missingModels: string[]
  /**
   * 全局键帽贴花（首版 0～1 张）：裁到全部键帽的顶层图片。
   * 由世界空间投影采样，不依赖 mesh UV。
   */
  imageDecals: PreviewImageDecal[]
  /**
   * 整盘刻字图集描述（纯数据）。渲染层烘焙为 CanvasTexture，
   * 仅在键帽顶面世界空间采样。
   */
  legendAtlas: LegendAtlasSpec
  /** 几何/外观/选择态变化标记 */
  revision: string
}

/** buildPreviewSceneModel 所需的设计状态快照（纯数据，非 Zustand） */
export interface PreviewDesignStateInput {
  templateId: string
  /** 全局字体（store 根字段，不在 globalKeycapStyle 内） */
  fontFamily: string
  fontWeight: number
  fontStyle: string
  globalKeycapStyle: {
    color: string
    labelColor: string
    borderColor: string
    borderHidden: boolean
    fontSize: number
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
          fontSize?: number
          fontFamily?: string
          fontWeight?: number
          fontStyle?: string
          letterSpacing?: number
          lineHeightRatio?: number
          labelOffsetX?: number
          labelOffsetY?: number
        }
      >
    >
  >
  selectedKeycapIds: ReadonlyArray<string>
  /** 画布图片元素（含 clipToKeycaps） */
  canvasElements?: ReadonlyArray<{
    id: string
    type: "image"
    assetId: string
    x: number
    y: number
    width: number
    height: number
    opacity: number
    rotation?: number
    clipToKeycaps?: boolean
    clipToKeycapId?: string
    clipToKeycapIds?: string[]
  }>
  /** assetId → data URL */
  assetMap?: Readonly<Record<string, string>>
  /** 拖拽跟手偏移（画板 px） */
  liveDragOverrides?: Readonly<Record<string, { dx: number; dy: number }>>
}
