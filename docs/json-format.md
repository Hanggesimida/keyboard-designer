# JSON 格式说明

本文档介绍键盘设计器中涉及的两类 JSON 格式：

1. **键盘布局模板 JSON**（`data/layouts/*.json`）——描述键盘物理布局，由开发者维护。
2. **设计导出 JSON**（用户通过"导出 JSON"功能生成）——保存当前画板的全部设计数据，可用于备份或后续导入。

---

## 一、键盘布局模板 JSON

文件位于 `apps/web/modules/design/data/layouts/`，目前包含：

| 文件 | 模板 ID | 说明 |
|---|---|---|
| `ansi-104.json` | `ansi-104` | ANSI 104 全尺寸 |
| `ansi-87.json` | `ansi-87` | ANSI 87 TKL |
| `ansi-108.json` | `ansi-108` | ANSI 108 全尺寸（带数字小键盘） |

### 顶层结构

```json
{
  "id": "ansi-104",
  "name": "ANSI 104 Fullsize",
  "totalKeys": 104,
  "baseUnit": 54,
  "rows": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 模板唯一标识符，与 `TemplateId` 枚举对应 |
| `name` | `string` | 模板可读名称 |
| `totalKeys` | `number` | 键位总数（仅作参考） |
| `baseUnit` | `number` | 基础单位长度（像素），1u 键帽对应的边长 |
| `rows` | `LayoutRow[]` | 键行数组，按视觉从上到下排列 |

### `LayoutRow`（键行）

```json
{
  "rowIndex": 0,
  "label": "功能行",
  "keys": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `rowIndex` | `number` | 行索引（从 0 开始） |
| `label` | `string` | 行可读名称，供界面展示 |
| `keys` | `KeyDef[]` | 该行所有键的定义数组 |

### `KeyDef`（键定义）

```json
{
  "keyId": "KC_ESC",
  "label": "Esc",
  "x": 0,
  "y": 0,
  "w": 1,
  "h": 1,
  "shape": "rect"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `keyId` | `string` | 键的唯一标识符（遵循 QMK 命名惯例），在整个布局内不重复 |
| `label` | `string` | 键帽默认显示文字（可被设计覆盖） |
| `x` | `number` | 键左上角的 X 坐标，单位为 **u**（1u = `baseUnit` px） |
| `y` | `number` | 键左上角的 Y 坐标，单位为 **u** |
| `w` | `number` | 键宽，单位为 **u**（标准键为 1，空格键为 6.25，等） |
| `h` | `number` | 键高，单位为 **u**（标准键为 1，小键盘 Enter/+ 为 2） |
| `shape` | `string` | 键帽形状，目前仅支持 `"rect"` |

#### 坐标系说明

- 原点 `(0, 0)` 位于整个键盘的左上角。
- X 轴向右，Y 轴向下。
- 坐标值以 **u** 为单位，实际像素 = 坐标值 × `baseUnit`。
- 功能区与主键区之间的视觉间距通过 Y 坐标偏移（如 `y: 1.25`）实现，不需要额外字段。

#### 完整行示例（数字行节选）

```json
{
  "rowIndex": 1,
  "label": "数字行",
  "keys": [
    { "keyId": "KC_GRV",  "label": "`",         "x": 0,  "y": 1.25, "w": 1,   "h": 1, "shape": "rect" },
    { "keyId": "KC_1",    "label": "1",          "x": 1,  "y": 1.25, "w": 1,   "h": 1, "shape": "rect" },
    { "keyId": "KC_BSPC", "label": "Backspace",  "x": 13, "y": 1.25, "w": 2,   "h": 1, "shape": "rect" }
  ]
}
```

---

## 二、设计导出 JSON

通过界面上的"导出 → JSON"功能生成，文件名格式为 `keyboard-<templateId>-<时间戳>.json`。

### 顶层结构

```json
{
  "version": 1,
  "templateId": "ansi-104",
  "artboardBackground": "#2c2c2c",
  "fontFamily": "var(--font-ibm-plex-mono)",
  "globalKeycapStyle": { ... },
  "layers": [ ... ],
  "layerKeycapOverrides": { ... },
  "canvasElements": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `version` | `number` | 格式版本号，当前为 `1` |
| `templateId` | `string` | 使用的键盘布局模板 ID（见上表） |
| `artboardBackground` | `string` | 画板背景色，CSS 颜色字符串（如 `"#2c2c2c"`） |
| `fontFamily` | `string` | 全局字体（见下方字体列表） |
| `globalKeycapStyle` | `GlobalKeycapStyle` | 全局键帽样式 |
| `layers` | `Layer[]` | 设计图层列表 |
| `layerKeycapOverrides` | `LayerKeycapOverrides` | 各图层的单键覆盖数据 |
| `canvasElements` | `CanvasElement[]` | 画板上的自由图片元素 |

### `GlobalKeycapStyle`（全局键帽样式）

```json
{
  "fontSize": 9,
  "labelColor": "#d0d0d0",
  "topColor": "#4a4a4a",
  "bgColor": "#3c3c3c",
  "borderColor": "#222222",
  "borderHidden": false
}
```

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `fontSize` | `number` | `9` | 标签字号（SVG 单位），影响全部键帽 |
| `labelColor` | `string` | `"#d0d0d0"` | 标签文字颜色 |
| `topColor` | `string` | `"#4a4a4a"` | 键帽顶面颜色，支持纯色或 CSS `linear-gradient(...)` |
| `bgColor` | `string` | `"#3c3c3c"` | 键帽底座颜色，支持纯色或渐变 |
| `borderColor` | `string` | `"#222222"` | 键帽边框颜色 |
| `borderHidden` | `boolean` | `false` | 是否全局隐藏边框 |

> **渐变支持**：`topColor` 和 `bgColor` 均支持 CSS `linear-gradient` 语法，例如：
> ```
> "linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)"
> ```

### `Layer`（设计图层）

```json
{
  "id": "layer-default-keycap",
  "name": "键帽层",
  "visible": true,
  "locked": false,
  "opacity": 1
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 图层唯一标识符 |
| `name` | `string` | 图层可读名称 |
| `visible` | `boolean` | 图层是否可见 |
| `locked` | `boolean` | 图层是否锁定（锁定后无法编辑键帽） |
| `opacity` | `number` | 图层整体透明度，范围 `0`–`1` |

- `layers` 数组的**首位**为视觉最顶层，末尾为最底层。

### `layerKeycapOverrides`（单键覆盖）

两级嵌套对象：`layerId → keycapId → KeycapOverride`。

```json
{
  "layer-default-keycap": {
    "KC_ESC": {
      "bgColor": "#ff0000",
      "labelText": "ESC"
    },
    "KC_SPACE": {
      "topColor": "linear-gradient(90deg, #6a11cb 0%, #2575fc 100%)",
      "labelColor": "#ffffff"
    }
  }
}
```

**`KeycapOverride` 所有字段均为可选**，仅覆盖与全局样式不同的属性：

| 字段 | 类型 | 说明 |
|---|---|---|
| `bgColor` | `string?` | 单键底座颜色（覆盖全局） |
| `topColor` | `string?` | 单键顶面颜色（覆盖全局） |
| `labelText` | `string?` | 自定义标签文字（覆盖模板默认文字） |
| `labelColor` | `string?` | 单键标签颜色（覆盖全局） |
| `fontSize` | `number?` | 单键字号（覆盖全局） |
| `borderColor` | `string?` | 单键边框颜色（覆盖全局） |
| `borderHidden` | `boolean?` | `true` 强制隐藏边框，`false` 在全局隐藏时仍强制显示，`undefined` 跟随全局 |
| `fontFamily` | `string?` | 单键字体（覆盖全局） |
| `labelOffsetX` | `number?` | 标签相对顶面中心的 X 偏移（SVG 单位） |
| `labelOffsetY` | `number?` | 标签相对顶面中心的 Y 偏移（SVG 单位） |

> 若某键的 override 对象为空（`{}`），等同于无覆盖，渲染时采用全局样式。

### `canvasElements`（画板自由元素）

画板上叠加的自由图片列表，**数组末尾**为视觉最顶层。

目前仅支持 `type: "image"` 类型：

```json
[
  {
    "id": "img-abc123",
    "type": "image",
    "src": "data:image/png;base64,...",
    "x": 120,
    "y": 80,
    "width": 300,
    "height": 200,
    "opacity": 0.85,
    "rotation": 15,
    "locked": false,
    "clipToKeycaps": false,
    "clipToKeycapId": null
  }
]
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 元素唯一标识符 |
| `type` | `"image"` | 元素类型，当前仅支持图片 |
| `src` | `string` | 图片数据，为 Base64 Data URL 或 Object URL |
| `x` | `number` | 相对画板左上角的 X 坐标（像素） |
| `y` | `number` | 相对画板左上角的 Y 坐标（像素） |
| `width` | `number` | 图片显示宽度（像素） |
| `height` | `number` | 图片显示高度（像素） |
| `opacity` | `number` | 透明度，范围 `0`–`1` |
| `rotation` | `number?` | 旋转角度（度），默认 `0` |
| `locked` | `boolean` | 是否锁定（锁定后无法拖拽） |
| `clipToKeycaps` | `boolean?` | `true` 时图片裁剪到所有键帽的联合形状（在 SVG 层渲染） |
| `clipToKeycapId` | `string?` | 裁剪到指定单个键帽形状（使用该键的 `keyId`，在 HTML 层渲染） |

> `clipToKeycaps` 与 `clipToKeycapId` 互斥，不应同时设置为有效值。

---

## 三、字体取值参考

`fontFamily` 字段（全局或单键 override）可使用以下值：

| 值 | 字体名称 | 分类 |
|---|---|---|
| `"var(--font-inter)"` | Inter | 无衬线 |
| `"var(--font-space-grotesk)"` | Space Grotesk | 无衬线 |
| `"var(--font-oxanium)"` | Oxanium | 无衬线 |
| `"var(--font-orbitron)"` | Orbitron | 无衬线 |
| `"var(--font-ibm-plex-mono)"` | IBM Plex Mono | 等宽（默认） |
| `"var(--font-jetbrains-mono)"` | JetBrains Mono | 等宽 |
| `"var(--font-dm-mono)"` | DM Mono | 等宽 |
| `"var(--font-playfair-display)"` | Playfair Display | 衬线 |
| `"var(--font-noto-sans-sc)"` | Noto Sans SC | 中文 |
| `"var(--font-noto-serif-sc)"` | Noto Serif SC | 中文 |

---

## 四、完整导出 JSON 示例

```json
{
  "version": 1,
  "templateId": "ansi-87",
  "artboardBackground": "#1a1a2e",
  "fontFamily": "var(--font-jetbrains-mono)",
  "globalKeycapStyle": {
    "fontSize": 9,
    "labelColor": "#e0e0e0",
    "topColor": "#16213e",
    "bgColor": "#0f3460",
    "borderColor": "#533483",
    "borderHidden": false
  },
  "layers": [
    {
      "id": "layer-default-keycap",
      "name": "键帽层",
      "visible": true,
      "locked": false,
      "opacity": 1
    },
    {
      "id": "layer-accent",
      "name": "强调色层",
      "visible": true,
      "locked": false,
      "opacity": 0.9
    }
  ],
  "layerKeycapOverrides": {
    "layer-default-keycap": {
      "KC_ESC": {
        "bgColor": "#e94560",
        "topColor": "#c73652",
        "labelColor": "#ffffff"
      }
    },
    "layer-accent": {
      "KC_SPACE": {
        "topColor": "linear-gradient(90deg, #533483 0%, #e94560 100%)"
      }
    }
  },
  "canvasElements": [
    {
      "id": "img-logo-001",
      "type": "image",
      "src": "data:image/png;base64,iVBORw0KGgo...",
      "x": 50,
      "y": 50,
      "width": 200,
      "height": 100,
      "opacity": 1,
      "locked": false,
      "clipToKeycaps": true
    }
  ]
}
```
