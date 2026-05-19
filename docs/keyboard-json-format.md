# 键盘设计 JSON 格式说明

本文档说明 JW Keyboard Designer 中两类 JSON 的结构与关系：

1. **布局原模板 JSON** — 内置键盘几何与默认键位标签，只读，位于 `apps/web/modules/design/data/layouts/`
2. **设计导出 JSON** — 用户在设计器中编辑后通过工具栏「导出 JSON」下载的文档，由 `exportArtboardJson()` 生成

相关源码：

- 原模板类型：`apps/web/modules/design/data/layouts/index.ts`、`KeycapNode.tsx` 中的 `KeyDef`
- 导出逻辑：`apps/web/modules/design/lib/design/exportArtboard.ts`
- 设计状态类型：`apps/web/modules/design/store/designUiStore.ts`

---

## 1. 布局原模板 JSON（Layout Template）

### 1.1 用途

原模板描述**键盘的物理布局**：每个键的 ID、默认标签、在网格中的位置与尺寸。应用启动时按 `templateId` 从注册表加载对应文件，用于渲染键帽几何与命中区域；**不包含**用户自定义颜色、图层、贴纸等设计数据。

内置模板 ID：

| `id`       | 说明              | `totalKeys` |
|------------|-------------------|-------------|
| `ansi-104` | ANSI 104 全尺寸   | 104         |
| `ansi-87`  | ANSI 87 TKL       | 87          |
| `ansi-108` | ANSI 108 全尺寸   | 108         |

文件路径示例：`apps/web/modules/design/data/layouts/ansi-104.json`。

### 1.2 根对象结构

| 字段         | 类型     | 必填 | 说明 |
|--------------|----------|------|------|
| `id`         | `string` | 是   | 模板唯一标识，与导出 JSON 中的 `templateId` 对应 |
| `name`       | `string` | 是   | 人类可读名称，如 `"ANSI 104 Fullsize"` |
| `totalKeys`  | `number` | 是   | 键位总数，应与所有 `rows[].keys` 数量一致 |
| `baseUnit`   | `number` | 是   | 单格标准宽度（像素），当前均为 `54` |
| `rows`       | `array`  | 是   | 按行分组的键位列表 |

### 1.3 `rows[]` 行对象

| 字段       | 类型     | 必填 | 说明 |
|------------|----------|------|------|
| `rowIndex` | `number` | 是   | 行序号，从 `0` 起，仅用于分组与展示 |
| `label`    | `string` | 是   | 行显示名，如 `"功能行"`、`"数字行"` |
| `keys`     | `array`  | 是   | 该行内的键位定义列表 |

### 1.4 `keys[]` 单键对象（`KeyDef`）

| 字段    | 类型     | 必填 | 说明 |
|---------|----------|------|------|
| `keyId` | `string` | 是   | 键位唯一 ID，建议 QMK 风格，如 `KC_ESC`、`KC_SPC` |
| `label` | `string` | 是   | 默认印刷标签文本 |
| `x`     | `number` | 是   | 左上角 X，单位为「标准键宽」的倍数（可为小数） |
| `y`     | `number` | 是   | 左上角 Y，单位为「标准键高」的倍数（可为小数） |
| `w`     | `number` | 是   | 宽度倍数，如 `2` 表示 2u 宽键 |
| `h`     | `number` | 是   | 高度倍数，如 `2` 表示 2u 高键 |
| `shape` | `string` | 是   | 键帽外形标识；当前实现均为 `"rect"` |

**坐标系说明：**

- `x`、`y` 以键盘区域左上角为原点，向右、向下为正。
- 单位是「1u = 一个标准键帽格」，不是像素；渲染时乘以 `baseUnit`（并扣除键帽间距 `KEYCAP_GAP`）得到 SVG 坐标。
- 行与行之间常用 `y` 增量 `1.25` 表示行间距；功能行与主区之间可用 `x` 的小数偏移（如 `15.25`）表示物理分区空隙。

### 1.5 完整原模板示例（结构示意）

以下为精简示例，展示完整嵌套关系；完整 104 键数据见仓库内 `ansi-104.json`。

```json
{
  "id": "ansi-104",
  "name": "ANSI 104 Fullsize",
  "totalKeys": 104,
  "baseUnit": 54,
  "rows": [
    {
      "rowIndex": 0,
      "label": "功能行",
      "keys": [
        {
          "keyId": "KC_ESC",
          "label": "Esc",
          "x": 0,
          "y": 0,
          "w": 1,
          "h": 1,
          "shape": "rect"
        },
        {
          "keyId": "KC_BSPC",
          "label": "Backspace",
          "x": 13,
          "y": 1.25,
          "w": 2,
          "h": 1,
          "shape": "rect"
        }
      ]
    },
    {
      "rowIndex": 5,
      "label": "底部行",
      "keys": [
        {
          "keyId": "KC_SPC",
          "label": "Space",
          "x": 3.75,
          "y": 5.25,
          "w": 6.25,
          "h": 1,
          "shape": "rect"
        }
      ]
    }
  ]
}
```

### 1.6 与原模板相关的运行时约定

- 切换模板时仅更新 `templateId`，**不会**自动清除已有 `layerKeycapOverrides`；若键 ID 在新模板中不存在，对应覆盖会被忽略。
- 导出 JSON **不内嵌**完整布局几何；恢复设计时需同时持有原模板（或相同 `templateId` 的内置文件）与导出文件。

---

## 2. 设计导出 JSON（Design Export）

### 2.1 用途与触发方式

`exportArtboardJson()` 将当前 Zustand 设计状态中的**可持久化设计字段**序列化为 JSON 并触发浏览器下载。文件名格式：

```text
keyboard-{templateId}-{YYYY-MM-DD-HHMMSS}.json
```

例如：`keyboard-ansi-104-2026-05-19-143052.json`。

同文件中的 `exportArtboardSvg` / `exportArtboardPng` 导出的是渲染后的位图/矢量，**不是**本文档描述的 JSON 结构。

### 2.2 根对象结构

| 字段                   | 类型     | 必填 | 说明 |
|------------------------|----------|------|------|
| `version`              | `number` | 是   | 格式版本，当前固定为 `1` |
| `templateId`           | `string` | 是   | 关联的布局模板 ID，如 `"ansi-104"` |
| `artboardBackground`   | `string` | 是   | 画板背景色，十六进制或 CSS 颜色 |
| `fontFamily`           | `string` | 是   | 全局默认字体，见 §2.6 |
| `globalKeycapStyle`    | `object` | 是   | 应用于全部键帽的全局样式 |
| `layers`               | `array`  | 是   | 键帽设计图层列表（顺序：数组靠前 = 视觉更上层） |
| `layerKeycapOverrides` | `object` | 是   | 按图层、按键 ID 的样式覆盖 |
| `canvasElements`       | `array`  | 是   | 画板上的自由图片元素 |

**未包含在导出中的字段**（纯 UI / 会话态，导入时需由应用重新初始化）：

- `selectedKeycapIds`、`activeLayerId`、`selectedElementId`
- `keycapEditTarget`、`liveDragOverrides`

### 2.3 `globalKeycapStyle` 全局键帽样式

单键 `layerKeycapOverrides` 中的同名字段会覆盖此处；未覆盖的键使用全局值。

| 字段           | 类型      | 说明 |
|----------------|-----------|------|
| `fontSize`     | `number`  | 标签字号（SVG 单位） |
| `labelColor`   | `string`  | 标签颜色，如 `"#d0d0d0"` |
| `topColor`     | `string`  | 键帽顶面填充，可为纯色或 `linear-gradient(...)` |
| `bgColor`      | `string`  | 键帽底座填充，可为纯色或渐变 |
| `borderColor`  | `string`  | 边框颜色 |
| `borderHidden` | `boolean` | 为 `true` 时全局隐藏边框 |

默认值（应用初始状态）：

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

渐变格式：`linear-gradient({angle}deg, #rrggbb {pos}%, ...)`，例如 `linear-gradient(90deg, #ff0000 0%, #0000ff 100%)`。

### 2.4 `layers[]` 图层对象

| 字段      | 类型      | 说明 |
|-----------|-----------|------|
| `id`      | `string`  | 图层唯一 ID；默认键帽层为 `"layer-default-keycap"` |
| `name`    | `string`  | 图层显示名 |
| `visible` | `boolean` | 是否可见 |
| `locked`  | `boolean` | 是否锁定编辑 |
| `opacity` | `number`  | 透明度 `0`–`1` |

### 2.5 `layerKeycapOverrides` 单键覆盖

嵌套结构：**`layerId` → `keycapId` → 覆盖字段**。`keycapId` 必须与原模板中的 `keyId` 一致。

`KeycapOverride` 中所有字段均为可选；仅出现的字段会覆盖全局/模板默认。

| 字段            | 类型      | 说明 |
|-----------------|-----------|------|
| `bgColor`       | `string`  | 底座颜色/渐变 |
| `topColor`      | `string`  | 顶面颜色/渐变 |
| `labelText`     | `string`  | 自定义标签文字（覆盖模板 `label`） |
| `labelColor`    | `string`  | 标签颜色 |
| `fontSize`      | `number`  | 标签字号 |
| `borderColor`   | `string`  | 边框颜色 |
| `borderHidden`  | `boolean` | `true` 强制隐藏边框；`false` 在全局隐藏时仍显示；省略则跟随全局 |
| `fontFamily`    | `string`  | 单键字体，覆盖全局 `fontFamily` |
| `labelOffsetX`  | `number`  | 标签相对顶面中心的 X 偏移（SVG 单位） |
| `labelOffsetY`  | `number`  | 标签相对顶面中心的 Y 偏移（SVG 单位） |

存储时会剔除空字符串字段；若某键覆盖对象变为空对象，则该键条目会被删除。

### 2.6 `fontFamily` 取值

导出值为设计器中选中的字体字符串，常见形式：

- Next/font CSS 变量：`"var(--font-ibm-plex-mono)"`、`"var(--font-inter)"` 等
- 系统字体：`"system-ui, sans-serif"`
- 字面量：`"Georgia, serif"`

完整可选列表见 `apps/web/modules/design/components/sidebar/sections/right/font-options.ts`。

### 2.7 `canvasElements[]` 画布图片元素

当前仅支持 `type: "image"`。

| 字段              | 类型      | 必填 | 说明 |
|-------------------|-----------|------|------|
| `id`              | `string`  | 是   | 元素唯一 ID |
| `type`            | `"image"` | 是   | 固定为 `"image"` |
| `src`             | `string`  | 是   | 图片地址，通常为 **data URL** 或 **blob object URL** |
| `x`               | `number`  | 是   | 相对画板左上角的 X（px） |
| `y`               | `number`  | 是   | 相对画板左上角的 Y（px） |
| `width`           | `number`  | 是   | 宽度（px） |
| `height`          | `number`  | 是   | 高度（px） |
| `opacity`         | `number`  | 是   | 透明度 `0`–`1`，默认 `1` |
| `locked`          | `boolean` | 是   | 是否锁定不可拖拽 |
| `rotation`        | `number`  | 否   | 旋转角度（度），默认 `0` |
| `clipToKeycaps`   | `boolean` | 否   | 为 `true` 时图片按与键帽重叠区域在 SVG 层裁剪（多键帽联合裁剪） |
| `clipToKeycapId`  | `string`  | 否   | 裁剪到单个键帽（`keyId`）；与 `clipToKeycaps` 互斥，在 HTML 层按单键矩形裁剪 |

**裁剪模式说明：**

- 均未设置：自由浮层，参与 `canvasElements` 数组顺序的 z 轴排序。
- `clipToKeycaps: true`：渲染在键盘 SVG 内部，不参与 HTML 层 z 序。
- `clipToKeycapId: "KC_ESC"`：绑定单个键帽轮廓，仍在 HTML 层，可与其他画布图调整叠放顺序。

数组顺序：**末尾元素视觉最靠上**。

### 2.8 完整导出 JSON 示例

```json
{
  "version": 1,
  "templateId": "ansi-104",
  "artboardBackground": "#2c2c2c",
  "fontFamily": "var(--font-ibm-plex-mono)",
  "globalKeycapStyle": {
    "fontSize": 9,
    "labelColor": "#d0d0d0",
    "topColor": "#4a4a4a",
    "bgColor": "#3c3c3c",
    "borderColor": "#222222",
    "borderHidden": false
  },
  "layers": [
    {
      "id": "layer-default-keycap",
      "name": "键帽层",
      "visible": true,
      "locked": false,
      "opacity": 1
    }
  ],
  "layerKeycapOverrides": {
    "layer-default-keycap": {
      "KC_ESC": {
        "topColor": "linear-gradient(180deg, #e63946 0%, #1d3557 100%)",
        "labelText": "退出",
        "labelColor": "#ffffff",
        "fontSize": 10
      },
      "KC_SPC": {
        "bgColor": "#1a1a2e",
        "borderHidden": true
      }
    }
  },
  "canvasElements": [
    {
      "id": "img-abc123",
      "type": "image",
      "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "x": 120,
      "y": 80,
      "width": 200,
      "height": 150,
      "opacity": 0.9,
      "rotation": 15,
      "locked": false
    },
    {
      "id": "img-clip-esc",
      "type": "image",
      "src": "data:image/jpeg;base64,/9j/4AAQ...",
      "x": 0,
      "y": 0,
      "width": 54,
      "height": 54,
      "opacity": 1,
      "locked": false,
      "clipToKeycapId": "KC_ESC"
    }
  ]
}
```

---

## 3. 两种 JSON 的关系

```text
┌─────────────────────────┐     templateId      ┌─────────────────────────┐
│  布局原模板 JSON         │ ◄────────────────── │  设计导出 JSON           │
│  (layouts/*.json)        │                     │  (用户下载 .json)        │
│  · 几何 x,y,w,h         │                     │  · 颜色 / 字体 / 图层    │
│  · 默认 label / keyId   │                     │  · 单键覆盖              │
│  · baseUnit             │                     │  · 画布贴纸              │
└─────────────────────────┘                     └─────────────────────────┘
         │                                                   │
         └─────────────────── 渲染时合并 ─────────────────────┘
                    全局样式 → 图层覆盖 → 单键覆盖
```

| 维度           | 原模板 JSON              | 导出 JSON                    |
|----------------|--------------------------|------------------------------|
| 是否包含键位坐标 | 是                       | 否（仅 `templateId` 引用）   |
| 是否包含用户配色 | 否                       | 是                           |
| 是否包含图片资源 | 否                       | 是（`src` 常为 base64）      |
| 版本字段       | 无                       | `version: 1`                 |
| 修改方式       | 开发者维护仓库内 JSON 文件 | 设计器编辑后导出             |

---

## 4. 导入与兼容性说明（当前实现）

- 应用**已实现** JSON 导出下载；**尚未**在 UI 中提供「从 JSON 导入」的一键恢复。若需程序化加载，应将导出字段写回 `useDesignUIStore` 的对应状态，并保证 `templateId` 在 `LAYOUT_REGISTRY` 中存在。
- `version` 非 `1` 时，未来可能需迁移脚本；当前仅写入 `1`。
- 大图以 data URL 嵌入会导致 JSON 体积很大，分享时建议压缩或改用外部存储 + URL（需自行扩展格式）。
- 切换 `templateId` 后，仅存在于旧模板的 `layerKeycapOverrides` 键 ID 不会报错，但也不会显示。

---

## 5. 变更记录

| 日期       | 说明 |
|------------|------|
| 2026-05-19 | 初版：对照 `exportArtboard.ts` 与 `designUiStore.ts` 编写 |
