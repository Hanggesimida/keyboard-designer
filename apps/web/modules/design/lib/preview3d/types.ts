import type { KeyShape, KeySection } from "@/modules/design/types/design"
import type {
  ImageProjectionAtlasSpec,
  TextureMatrixElements,
} from "@/modules/design/lib/design/imageProjection"

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
  /** 真实键盘按下 */
  pressed: boolean
  visible: boolean
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
  matrixElements: TextureMatrixElements
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

/** 按布局解析后的真实 GLB 外壳 */
export interface PreviewCase {
  modelPath: string
  /** GLB 内声明的布局 ID；144 的值为 ansi-108 */
  assetLayoutId: string
  /** 模型原点放置位置；XZ 为对应 base 键区中心 */
  position: [number, number, number]
  /** 米制 GLB → 1u 世界单位 */
  scale: number
  /** 包含脚垫与 USB 结构的世界包围盒 */
  bounds: PreviewSceneBounds
  /** 主体色，来自全局「键盘颜色」 */
  bodyColor: string
}

/** 渲染层只消费此模型，不直接读 layout JSON / store */
export interface PreviewSceneModel {
  templateId: string
  baseUnit: number
  keys: PreviewKey[]
  bounds: PreviewSceneBounds
  /** 当前模板对应的真实外壳；未知模板为 null */
  case: PreviewCase | null
  /**
   * 当前布局未命中的期望 GLB 文件名（去重排序）。
   * 空数组表示全部有真模。
   */
  missingModels: string[]
  /** 按 2D 规则合成的整盘图片图集，由世界 XZ 正交投影。 */
  imageProjectionAtlas: ImageProjectionAtlasSpec
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
  /** 全局「键盘颜色」（store.artboardBackground） */
  artboardBackground: string
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
  /** 真实键盘当前按下的键帽 id */
  pressedKeyIds?: ReadonlyArray<string>
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
    clipToTopFace?: boolean
  }>
  /** assetId → data URL */
  assetMap?: Readonly<Record<string, string>>
  /** 拖拽跟手偏移（画板 px） */
  liveDragOverrides?: Readonly<Record<string, { dx: number; dy: number }>>
}
