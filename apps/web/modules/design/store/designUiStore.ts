import { create, useStore } from "zustand"
import { temporal } from "zundo"
import type { TemporalState } from "zundo"
import { DEFAULT_ARTBOARD_BG, DEFAULT_KEYCAP_COLORS } from "@/modules/design/lib/designDefaults"

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
  /** 是否隐藏该图层上所有键帽的文字标签 */
  labelsHidden?: boolean
}

// ─── 画布自由元素 ──────────────────────────────────────
export type CanvasElementType = "image"

export interface CanvasImageElement {
  id: string
  type: "image"
  /**
   * 素材库中的资源 ID，对应 assetMap 中的键。
   * 将图片内容从元素元数据中解耦，使 assetMap 可独立于撤销历史存在。
   */
  assetId: string
  /** 相对画板左上角的 X 坐标（px） */
  x: number
  /** 相对画板左上角的 Y 坐标（px） */
  y: number
  width: number
  height: number
  /** 透明度 0-1，默认 1 */
  opacity: number
  /** 旋转角度（度），默认 0 */
  rotation?: number
  /** 是否锁定（锁定后不可拖拽） */
  locked: boolean
  /**
   * 是否将图片裁剪到键帽形状。
   * true 时图片仅在与之重叠的键帽底座形状内可见（在 SVG 层以 clipPath 渲染），
   * false（默认）时图片自由浮层显示。
   */
  clipToKeycaps?: boolean
  /**
   * 将图片裁剪到指定单个键帽的底座形状，并作为普通画布元素参与全局 z 轴排序。
   * 与 clipToKeycaps 互斥：clipToKeycapId 有值时在 HTML 层以 CSS clip-path 渲染，
   * 可在图层面板中自由调整与其他画布图片的叠放顺序。
   */
  clipToKeycapId?: string
  /**
   * 显式限定图片仅在这些键帽内可见，取代基于矩形相交的自动检测。
   * 与 clipToKeycaps: true 搭配使用；为空/未设置时回退到几何相交检测（向后兼容）。
   */
  clipToKeycapIds?: string[]
  /**
   * 是否将裁剪区域收窄到键帽顶面（top face）而非底座。
   * 仅在 clipToKeycaps 或 clipToKeycapId 生效时有意义。
   */
  clipToTopFace?: boolean
  /**
   * 是否为矢量 SVG 图形。
   * true 时 assetMap 中对应值为 SVG base64 data URL，渲染时不会光栅化。
   */
  isSvg?: boolean
}

export type CanvasElement = CanvasImageElement

export interface KeycapOverride {
  bgColor?: string
  topColor?: string
  labelText?: string
  labelColor?: string
  fontSize?: number
  borderColor?: string
  /**
   * 边框显隐相对全局：`true` 强制隐藏，`false` 在全局隐藏时仍强制显示，
   * `undefined` 跟随全局 `GlobalKeycapStyle.borderHidden`。
   */
  borderHidden?: boolean
  fontFamily?: string
  /** 字重：400 = 常规，700 = 加粗（默认跟随全局） */
  fontWeight?: number
  /** 字形：'normal' = 正常，'italic' = 斜体（默认跟随全局） */
  fontStyle?: string
  /** 字间距（SVG letter-spacing，单位 px，默认 0） */
  letterSpacing?: number
  /** 行距倍率（相对字号，默认 1.2） */
  lineHeightRatio?: number
  /** 标签相对顶面中心的 X 偏移（SVG 单位） */
  labelOffsetX?: number
  /** 标签相对顶面中心的 Y 偏移（SVG 单位） */
  labelOffsetY?: number
}

/** 应用于全部键帽的全局样式（单键 override 优先） */
export interface GlobalKeycapStyle {
  fontSize: number
  labelColor: string
  topColor: string
  bgColor: string
  borderColor: string
  /** 全局隐藏边框时，单键可通过 override.borderHidden === false 强制显示 */
  borderHidden: boolean
}

export const TEMPLATES = [
  { id: "ansi-104", label: "ANSI 104 全尺寸", enabled: true },
  { id: "ansi-87", label: "ANSI 87 TKL", enabled: true },
  { id: "ansi-108", label: "ANSI 108 全尺寸", enabled: true },
  { id: "ansi-61", label: "ANSI 61 (60%)", enabled: true },
  { id: "ansi-68", label: "ANSI 68 (68%)", enabled: true },
  { id: "ansi-81", label: "ANSI 81 (81%)", enabled: true },
  { id: "ansi-144", label: "ANSI 144 带增补区", enabled: true },
] as const

export type TemplateId = (typeof TEMPLATES)[number]["id"]

/**
 * 按图层分组的键帽覆盖数据。
 * 结构：layerId -> keycapId -> KeycapOverride
 */
export type LayerKeycapOverrides = Record<string, Record<string, KeycapOverride>>

interface DesignUIState {
  templateId: TemplateId
  layers: Layer[]
  activeLayerId: string | null
  artboardBackground: string
  fontFamily: string
  /** 全局字重：400 = 常规，700 = 加粗 */
  fontWeight: number
  /** 全局字形：'normal' = 正常，'italic' = 斜体 */
  fontStyle: string
  globalKeycapStyle: GlobalKeycapStyle
  /** 当前多选的键帽 ID 列表（空数组表示未选中任何键帽） */
  selectedKeycapIds: string[]
  /** 按图层分组的单键覆盖。第一层 key 为 layerId，第二层 key 为 keycapId */
  layerKeycapOverrides: LayerKeycapOverrides
  /** 画板上的自由元素（图片/贴纸等） */
  canvasElements: CanvasElement[]
  /** 当前选中的画布元素 ID（null 表示未选中） */
  selectedElementId: string | null
  /** 单键帽编辑模式目标（null 表示未进入）—— 纯 UI 状态，不参与 undo */
  keycapEditTarget: { keyId: string; layerId: string } | null
  /**
   * 拖拽中的实时位置偏移（纯 UI 预览，不参与 undo）。
   * key 为画布元素 id，value 为相对提交坐标的 dx/dy（画板坐标，px）。
   */
  liveDragOverrides: Record<string, { dx: number; dy: number }>
  /**
   * 素材库：assetId → base64 data URL。
   * 图片内容存储在此处，CanvasImageElement 只持有 assetId 引用。
   * 此字段不参与撤销历史（在 partialize 中排除），避免大型 base64 字符串
   * 随每次状态快照复制，也支持相同图片的跨元素去重。
   */
  assetMap: Record<string, string>
}

interface DesignUIActions {
  /** 将所有设计修改重置为初始默认状态（键帽覆盖、全局样式、画板背景、画布元素等） */
  resetAll: () => void
  setTemplateId: (id: TemplateId) => void
  /** 将选中集合替换为给定 ID 列表；additive 为 true 时保留已选中的画布图片 */
  setSelectedKeycapIds: (ids: string[], options?: { additive?: boolean }) => void
  /** 切换单个键帽的选中状态（用于 Shift+点击，不清除已选中的画布图片） */
  toggleKeycapSelection: (id: string) => void
  /** 清空键帽与画布元素选中（保留活动图层） */
  clearSelection: () => void
  /** 清空全部选中态，含活动图层（点击画布空白） */
  deselectAll: () => void
  setActiveLayer: (id: string | null) => void
  toggleLayerVisible: (id: string) => void
  toggleLayerLocked: (id: string) => void
  toggleLayerLabelsHidden: (id: string) => void
  setLayerOpacity: (id: string, opacity: number) => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setArtboardBackground: (color: string) => void
  setFontFamily: (font: string) => void
  setFontWeight: (weight: number) => void
  setFontStyle: (style: string) => void
  setGlobalKeycapStyle: (patch: Partial<GlobalKeycapStyle>) => void
  /** 将全局键帽样式与默认字体恢复为初始值（不影响单键覆盖与其它设计数据） */
  resetGlobalKeycapStyleSettings: () => void
  /** 写入指定图层的单键覆盖 */
  setKeycapOverride: (layerId: string, keycapId: string, patch: Partial<KeycapOverride>) => void
  /** 批量写入指定图层多个键帽的覆盖（用于多选批量编辑） */
  setMultipleKeycapOverrides: (layerId: string, keycapIds: string[], patch: Partial<KeycapOverride>) => void
  /** 批量写入指定图层每个键帽各自不同的覆盖（用于对齐操作，单次 undo） */
  batchSetKeycapOverrides: (layerId: string, overrides: Record<string, Partial<KeycapOverride>>) => void
  /** 清除指定图层的单键覆盖 */
  clearKeycapOverride: (layerId: string, keycapId: string) => void
  /** 批量清除指定图层多个键帽的覆盖 */
  clearMultipleKeycapOverrides: (layerId: string, keycapIds: string[]) => void
  /**
   * 注册素材并返回 assetId。
   * 若 assetMap 中已存在相同 src，则复用现有 assetId（去重）；否则新建条目。
   * assetMap 本身不参与撤销历史，素材数据在会话期间保持稳定。
   */
  addAsset: (src: string) => string
  /** 添加画布元素 */
  addCanvasElement: (element: CanvasElement) => void
  /** 更新画布元素的部分属性 */
  updateCanvasElement: (id: string, patch: Partial<Omit<CanvasElement, "id" | "type">>) => void
  /** 将画布图片限定到指定键位列表，或传 null 清除限定 */
  setElementKeycapRestriction: (id: string, keyIds: string[] | null) => void
  /** 删除画布元素 */
  removeCanvasElement: (id: string) => void
  /** 设置选中的画布元素 ID；additive 为 true 时保留已选中的键帽 */
  setSelectedElementId: (id: string | null, options?: { additive?: boolean }) => void
  /** 进入/退出单键帽编辑模式 */
  setKeycapEditTarget: (target: { keyId: string; layerId: string } | null) => void
  /** 写入拖拽实时偏移（clip-to-keycaps 图片拖拽时使用） */
  setLiveDragOverride: (id: string, dx: number, dy: number) => void
  /** 清除拖拽实时偏移（拖拽结束时调用） */
  clearLiveDragOverride: (id: string) => void
  /**
   * 调整画布自由图片的层叠顺序。
   * canvasElements 数组末尾 = 视觉最顶层；'up' 表示视觉上移（向数组末尾移动），'down' 表示视觉下移。
   */
  reorderCanvasElement: (id: string, direction: "up" | "down") => void
  /**
   * 调整键帽设计层的层叠顺序。
   * layers 数组首位 = 视觉最顶层；'up' 表示视觉上移（向数组首位移动），'down' 表示视觉下移。
   */
  reorderLayer: (id: string, direction: "up" | "down") => void
}

const initialGlobalKeycapStyle: GlobalKeycapStyle = {
  fontSize: 7,
  labelColor: DEFAULT_KEYCAP_COLORS.labelColor,
  topColor: DEFAULT_KEYCAP_COLORS.topColor,
  bgColor: DEFAULT_KEYCAP_COLORS.bgColor,
  borderColor: DEFAULT_KEYCAP_COLORS.borderColor,
  borderHidden: false,
}

/** 默认图层使用固定 id，避免 SSR 与客户端各自执行 nanoid() 导致 hydration 不一致 */
const initialLayers: Layer[] = [
  { id: "layer-default-keycap", name: "键帽层", visible: true, locked: false, opacity: 1 },
]

/**
 * 只追踪设计数据变更，排除纯 UI 选择态、实时预览态以及素材库（assetMap）。
 * assetMap 含大型 base64 字符串，不应随状态快照复制；素材去重也依赖其跨历史持久化。
 */
export type UndoableDesignState = Omit<DesignUIState, "selectedKeycapIds" | "activeLayerId" | "selectedElementId" | "keycapEditTarget" | "liveDragOverrides" | "assetMap">

function applyOverridePatch(
  prev: KeycapOverride,
  patch: Partial<KeycapOverride>,
): KeycapOverride {
  const merged: KeycapOverride = { ...prev }
  for (const [k, v] of Object.entries(patch) as [keyof KeycapOverride, KeycapOverride[keyof KeycapOverride]][]) {
    if (v === undefined) {
      delete (merged as Record<string, unknown>)[k as string]
    } else {
      ;(merged as Record<string, unknown>)[k as string] = v
    }
  }
  // 清除空字符串字段（labelText 允许为空，表示用户主动清空文案）
  const cleaned: KeycapOverride = {}
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined) continue
    if (typeof v === "string" && v === "" && k !== "labelText") continue
    ;(cleaned as Record<string, unknown>)[k] = v
  }
  return cleaned
}

export const useDesignUIStore = create<DesignUIState & DesignUIActions>()(
  temporal(
  (set, get) => ({
    templateId: "ansi-144",
    layers: initialLayers,
    activeLayerId: null,
    artboardBackground: DEFAULT_ARTBOARD_BG,
    fontFamily: "var(--font-ibm-plex-mono)",
    fontWeight: 400,
    fontStyle: "normal",
    globalKeycapStyle: initialGlobalKeycapStyle,
    selectedKeycapIds: [],
    layerKeycapOverrides: {},
    canvasElements: [],
    selectedElementId: null,
    keycapEditTarget: null,
    liveDragOverrides: {},
    assetMap: {},

    resetAll: () =>
      set({
        templateId: "ansi-144",
        layers: initialLayers,
        globalKeycapStyle: initialGlobalKeycapStyle,
        layerKeycapOverrides: {},
        artboardBackground: DEFAULT_ARTBOARD_BG,
        fontFamily: "var(--font-ibm-plex-mono)",
        fontWeight: 400,
        fontStyle: "normal",
        canvasElements: [],
        selectedKeycapIds: [],
        selectedElementId: null,
        activeLayerId: null,
        keycapEditTarget: null,
        liveDragOverrides: {},
        assetMap: {},
      }),

    setTemplateId: (id) => set({ templateId: id, selectedKeycapIds: [] }),

    setSelectedKeycapIds: (ids, options) =>
      set((s) => {
        if (ids.length === 0) {
          return { selectedKeycapIds: ids }
        }
        return {
          selectedKeycapIds: ids,
          activeLayerId: s.activeLayerId ?? s.layers[0]?.id ?? null,
          ...(options?.additive ? {} : { selectedElementId: null }),
        }
      }),

    toggleKeycapSelection: (id) =>
      set((s) => {
        const isRemoving = s.selectedKeycapIds.includes(id)
        const nextIds = isRemoving
          ? s.selectedKeycapIds.filter((x) => x !== id)
          : [...s.selectedKeycapIds, id]
        return {
          selectedKeycapIds: nextIds,
          ...(!isRemoving
            ? { activeLayerId: s.activeLayerId ?? s.layers[0]?.id ?? null }
            : {}),
        }
      }),

    clearSelection: () => set({ selectedKeycapIds: [], selectedElementId: null }),

    deselectAll: () =>
      set({ selectedKeycapIds: [], selectedElementId: null, activeLayerId: null }),

    setActiveLayer: (id) => set({ activeLayerId: id }),

    toggleLayerVisible: (id) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, visible: !l.visible } : l,
        ),
        // 如果隐藏了当前选中键帽所在的活动图层，清除选中态
        selectedKeycapIds:
          s.activeLayerId === id &&
          s.layers.find((l) => l.id === id)?.visible === true
            ? []
            : s.selectedKeycapIds,
      })),

    toggleLayerLocked: (id) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, locked: !l.locked } : l,
        ),
      })),

    toggleLayerLabelsHidden: (id) =>
      set((s) => ({
        layers: s.layers.map((l) =>
          l.id === id ? { ...l, labelsHidden: !l.labelsHidden } : l,
        ),
      })),

    setLayerOpacity: (id, opacity) =>
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
      })),

    removeLayer: (id) =>
      set((s) => {
        const next = s.layers.filter((l) => l.id !== id)
        const activeLayerId =
          s.activeLayerId === id ? (next[0]?.id ?? null) : s.activeLayerId
        // 同步清除该图层的所有覆盖数据
        const nextOverrides = { ...s.layerKeycapOverrides }
        delete nextOverrides[id]
        return {
          layers: next,
          activeLayerId,
          layerKeycapOverrides: nextOverrides,
        }
      }),

    renameLayer: (id, name) =>
      set((s) => ({
        layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)),
      })),

    setArtboardBackground: (color) => set({ artboardBackground: color }),
    setFontFamily: (font) => set({ fontFamily: font }),
    setFontWeight: (weight) => set({ fontWeight: weight }),
    setFontStyle: (style) => set({ fontStyle: style }),

    setGlobalKeycapStyle: (patch) =>
      set((s) => ({
        globalKeycapStyle: { ...s.globalKeycapStyle, ...patch },
      })),

    resetGlobalKeycapStyleSettings: () =>
      set({
        globalKeycapStyle: initialGlobalKeycapStyle,
        fontFamily: "var(--font-ibm-plex-mono)",
        fontWeight: 400,
        fontStyle: "normal",
      }),

    setKeycapOverride: (layerId, keycapId, patch) =>
      set((s) => {
        const layerOverrides = s.layerKeycapOverrides[layerId] ?? {}
        const prev = layerOverrides[keycapId] ?? {}
        const cleaned = applyOverridePatch(prev, patch)
        const nextLayerOverrides = { ...layerOverrides }
        if (Object.keys(cleaned).length > 0) {
          nextLayerOverrides[keycapId] = cleaned
        } else {
          delete nextLayerOverrides[keycapId]
        }
        return {
          layerKeycapOverrides: {
            ...s.layerKeycapOverrides,
            [layerId]: nextLayerOverrides,
          },
        }
      }),

    setMultipleKeycapOverrides: (layerId, keycapIds, patch) =>
      set((s) => {
        const layerOverrides = s.layerKeycapOverrides[layerId] ?? {}
        const nextLayerOverrides = { ...layerOverrides }
        for (const keycapId of keycapIds) {
          const prev = nextLayerOverrides[keycapId] ?? {}
          const cleaned = applyOverridePatch(prev, patch)
          if (Object.keys(cleaned).length > 0) {
            nextLayerOverrides[keycapId] = cleaned
          } else {
            delete nextLayerOverrides[keycapId]
          }
        }
        return {
          layerKeycapOverrides: {
            ...s.layerKeycapOverrides,
            [layerId]: nextLayerOverrides,
          },
        }
      }),

    batchSetKeycapOverrides: (layerId, overrides) =>
      set((s) => {
        const layerOverrides = s.layerKeycapOverrides[layerId] ?? {}
        const nextLayerOverrides = { ...layerOverrides }
        for (const [keycapId, patch] of Object.entries(overrides)) {
          const prev = nextLayerOverrides[keycapId] ?? {}
          const cleaned = applyOverridePatch(prev, patch)
          if (Object.keys(cleaned).length > 0) {
            nextLayerOverrides[keycapId] = cleaned
          } else {
            delete nextLayerOverrides[keycapId]
          }
        }
        return {
          layerKeycapOverrides: {
            ...s.layerKeycapOverrides,
            [layerId]: nextLayerOverrides,
          },
        }
      }),

    clearKeycapOverride: (layerId, keycapId) =>
      set((s) => {
        const layerOverrides = s.layerKeycapOverrides[layerId]
        if (!layerOverrides || !(keycapId in layerOverrides)) return s
        const next = { ...layerOverrides }
        delete next[keycapId]
        return {
          layerKeycapOverrides: {
            ...s.layerKeycapOverrides,
            [layerId]: next,
          },
        }
      }),

    clearMultipleKeycapOverrides: (layerId, keycapIds) =>
      set((s) => {
        const layerOverrides = s.layerKeycapOverrides[layerId]
        if (!layerOverrides) return s
        const next = { ...layerOverrides }
        for (const id of keycapIds) {
          delete next[id]
        }
        return {
          layerKeycapOverrides: {
            ...s.layerKeycapOverrides,
            [layerId]: next,
          },
        }
      }),

    addAsset: (src) => {
      const { assetMap } = get()
      for (const [id, existingSrc] of Object.entries(assetMap)) {
        if (existingSrc === src) return id
      }
      const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      set((s) => ({ assetMap: { ...s.assetMap, [assetId]: src } }))
      return assetId
    },

    addCanvasElement: (element) =>
      set((s) => ({
        canvasElements: [...s.canvasElements, element],
        selectedElementId: element.id,
        selectedKeycapIds: [],
        activeLayerId: null,
      })),

    updateCanvasElement: (id, patch) =>
      set((s) => ({
        canvasElements: s.canvasElements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as CanvasElement) : el,
        ),
      })),

    setElementKeycapRestriction: (id, keyIds) => {
      if (keyIds && keyIds.length > 0) {
        get().updateCanvasElement(id, { clipToKeycaps: true, clipToKeycapIds: keyIds })
      } else {
        get().updateCanvasElement(id, { clipToKeycaps: false, clipToKeycapIds: undefined })
      }
    },

    removeCanvasElement: (id) =>
      set((s) => ({
        canvasElements: s.canvasElements.filter((el) => el.id !== id),
        selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
      })),

    setSelectedElementId: (id, options) =>
      set((s) => ({
        selectedElementId: id,
        ...(id !== null && !options?.additive
          ? { selectedKeycapIds: [], activeLayerId: null }
          : {}),
      })),

    setKeycapEditTarget: (target) => set({ keycapEditTarget: target }),

    setLiveDragOverride: (id, dx, dy) =>
      set((s) => ({ liveDragOverrides: { ...s.liveDragOverrides, [id]: { dx, dy } } })),

    clearLiveDragOverride: (id) =>
      set((s) => {
        if (!(id in s.liveDragOverrides)) return s
        const next = { ...s.liveDragOverrides }
        delete next[id]
        return { liveDragOverrides: next }
      }),

    reorderCanvasElement: (id, direction) =>
      set((s) => {
        const arr = [...s.canvasElements]
        const idx = arr.findIndex((el) => el.id === id)
        if (idx === -1) return s
        // 视觉"上移" = 数组中向后移动（末尾 = 最顶层）
        const targetIdx = direction === "up" ? idx + 1 : idx - 1
        if (targetIdx < 0 || targetIdx >= arr.length) return s
        ;[arr[idx], arr[targetIdx]] = [arr[targetIdx]!, arr[idx]!]
        return { canvasElements: arr }
      }),

    reorderLayer: (id, direction) =>
      set((s) => {
        const arr = [...s.layers]
        const idx = arr.findIndex((l) => l.id === id)
        if (idx === -1) return s
        // 视觉"上移" = 数组中向前移动（首位 = 最顶层）
        const targetIdx = direction === "up" ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= arr.length) return s
        ;[arr[idx], arr[targetIdx]] = [arr[targetIdx]!, arr[idx]!]
        return { layers: arr }
      }),
  }),
  {
    partialize: (state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { selectedKeycapIds, activeLayerId, selectedElementId, keycapEditTarget, liveDragOverrides, assetMap, ...undoable } = state
      return undoable as UndoableDesignState
    },
    /**
     * 浅比较 partialize 后的快照：只有可撤销字段真正发生变化时才推入历史。
     * 这样 setSelectedKeycapIds / setActiveLayer 等纯 UI 操作不会产生历史记录。
     */
    equality: (a, b) => {
      const keysA = Object.keys(a) as (keyof typeof a)[]
      if (keysA.length !== Object.keys(b).length) return false
      return keysA.every((k) => a[k] === b[k])
    },
  },
  ),
)

/** 消费撤销/重做状态的 hook */
export const useTemporalDesignStore = <T>(
  selector: (state: TemporalState<UndoableDesignState>) => T,
) => useStore(useDesignUIStore.temporal, selector)
