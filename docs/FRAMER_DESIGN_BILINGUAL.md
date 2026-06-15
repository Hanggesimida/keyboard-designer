---
version: alpha
name: Framer-design-analysis
description: |
  EN: A confident dark-canvas builder marketing site that treats the page like a working artboard — pure black surfaces, white display type set in GT Walsheim Medium with aggressive negative tracking, and a single confident blue (#0099ff) reserved for hyperlinks and selection states.
  中文：自信的黑底画布式建站工具营销站，将页面当作可工作的画板——纯黑表面、GT Walsheim Medium 白色展示字体配合激进负字距，单一自信蓝 (#0099ff) 专用于超链接与选中状态。

colors:
  primary: "#ffffff"
  on-primary: "#000000"
  accent-blue: "#0099ff"
  ink: "#ffffff"
  ink-muted: "#999999"
  canvas: "#090909"
  surface-1: "#141414"
  surface-2: "#1c1c1c"
  hairline: "#262626"
  hairline-soft: "#1a1a1a"
  inverse-canvas: "#ffffff"
  inverse-ink: "#000000"
  gradient-magenta: "#d44df0"
  gradient-violet: "#6a4cf5"
  gradient-orange: "#ff7a3d"
  gradient-coral: "#ff5577"
  semantic-success: "#22c55e"

typography:
  display-xxl:
    fontFamily: GT Walsheim Framer Medium
    fontSize: 110px
    fontWeight: 500
    lineHeight: 0.85
    letterSpacing: -5.5px
  display-xl:
    fontFamily: GT Walsheim Medium
    fontSize: 85px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -4.25px
    fontFeature: ss02
  display-lg:
    fontFamily: GT Walsheim Medium
    fontSize: 62px
    fontWeight: 500
    lineHeight: 1.00
    letterSpacing: -3.1px
    fontFeature: ss02
  display-md:
    fontFamily: GT Walsheim Medium
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.13
    letterSpacing: -1.0px
  headline:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: 700
    lineHeight: 1.20
    letterSpacing: -0.8px
    fontFeature: cv05
  subhead:
    fontFamily: Inter Variable
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.01px
    fontFeature: cv11
  body-lg:
    fontFamily: Inter Variable
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.18px
    fontFeature: cv11
  body:
    fontFamily: Inter Variable
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.30
    letterSpacing: -0.15px
    fontFeature: cv11
  body-sm:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.40
    letterSpacing: -0.14px
    fontFeature: cv11
  caption:
    fontFamily: Inter Variable
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: -0.13px
    fontFeature: cv11
  micro:
    fontFamily: Inter Variable
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.20
    letterSpacing: -0.12px
    fontFeature: cv11
  button:
    fontFamily: Inter Variable
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.14px
    fontFeature: cv11

rounded:
  xs: 4px
  sm: 6px
  md: 10px
  lg: 15px
  xl: 20px
  xxl: 30px
  pill: 100px
  full: 9999px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 15px
  lg: 20px
  xl: 30px
  xxl: 40px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  button-primary-pressed:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 10px 15px
  button-translucent:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.xxl}"
    padding: 8px 14px
  button-icon-circular:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    size: 40px
  pricing-tab-default:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  pricing-tab-selected:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 8px 14px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  text-input-focused:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  pricing-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  pricing-card-featured:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: 24px
  template-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 12px
  gradient-spotlight-card:
    backgroundColor: "{colors.gradient-violet}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  gradient-spotlight-card-magenta:
    backgroundColor: "{colors.gradient-magenta}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  gradient-spotlight-card-orange:
    backgroundColor: "{colors.gradient-orange}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.xl}"
    padding: 32px
  product-mockup-tile:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xl}"
    padding: 16px
  feature-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
  comparison-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
  faq-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 24px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 64px 32px
---

# Framer Design Analysis / Framer 设计分析

> 本文档为 `FRAMER_DESIGN.md` 的中英对照版本。设计 token 数值保持与原文一致，正文采用 **EN → 中文** 对照格式。

---

## Overview / 概述

**EN:** Framer's marketing canvas is a near-pure black artboard. The dominant surface is `{colors.canvas}` — almost pure black with a faint warmth — and on top of it sits oversized white display type set in **GT Walsheim Medium** with letter-spacing pulled to extreme negative values (-5.5px on the 110px display, -4.25px on the 85px hero). The page reads like a poster: one assertive statement per band, generous breathing room above and below.

**中文：** Framer 的营销画布近乎纯黑画板。主表面为 `{colors.canvas}`——近乎纯黑、略带暖调——其上叠加 **GT Walsheim Medium** 超大号白色展示字体，字距拉至极负值（110px 展示级为 -5.5px，85px 主视觉为 -4.25px）。整页读起来像海报：每个区块一句有力陈述，上下留白充裕。

**EN:** The single accent is `{colors.accent-blue}` — used scarcely, mostly for hyperlinks, selection halos, and a subtle blue-tinted shadow ring on focused inputs. The brand chrome itself is monochrome: white pill buttons, charcoal cards, gray secondary text. What makes Framer distinctive is the rhythm break — every few sections the page drops in a **vibrant gradient atmosphere card**: a magenta-violet spotlight, a sunset-orange wash, a coral-pink panel. These aren't section backgrounds; they're individual cards arranged in a card grid, each one a small living poster that shows what Framer can produce.

**中文：** 唯一强调色为 `{colors.accent-blue}`——使用克制，主要用于超链接、选中光晕，以及聚焦输入框的淡蓝阴影环。品牌外壳本身是单色的：白色药丸按钮、炭灰卡片、灰色次要文字。Framer 的辨识度来自节奏打断——每隔几个区块，页面会插入一张**鲜艳渐变氛围卡片**：洋红紫聚光灯、日落橙晕染、珊瑚粉面板。它们不是整段背景，而是卡片网格中的独立卡片，每张都是展示 Framer 产出能力的小型活海报。

**EN:** Body type is **Inter Variable**, with Framer leaning hard into Inter's character variants (`cv01`, `cv05`, `cv09`, `cv11`, `ss03`, `ss07`, `dlig`) — the result is a body voice that feels custom-tuned, with single-storey "a", straight-leg "l", and tabular figures. There's no light mode on the marketing site; the brand IS dark.

**中文：** 正文字体为 **Inter Variable**，Framer 大量使用 Inter 字符变体（`cv01`、`cv05`、`cv09`、`cv11`、`ss03`、`ss07`、`dlig`）——正文语感像定制调校过：单层「a」、直腿「l」、表格数字。营销站没有浅色模式；品牌即暗色。

### Key Characteristics / 核心特征

| EN | 中文 |
|---|---|
| Black-canvas marketing system: `{colors.canvas}` is the surface for hero, body, pricing, FAQ, and footer alike — no light interludes. | 黑底营销体系：`{colors.canvas}` 同时用于主视觉、正文、定价、FAQ 与页脚——无浅色穿插。 |
| Massive negative letter-spacing on display sizes (-5.5px / -4.25px / -3.1px) creates a poster-grade headline cadence. | 展示级极大负字距（-5.5px / -4.25px / -3.1px）形成海报级标题节奏。 |
| White pill (`{components.button-primary}`) is the only primary CTA shape across the site; secondary actions live as charcoal pills (`{components.button-secondary}`) or text links. | 白色药丸（`{components.button-primary}`）是全站唯一主 CTA 形态；次要操作为炭灰药丸（`{components.button-secondary}`）或文字链接。 |
| Oversized **gradient spotlight cards** (violet, magenta, orange, coral) act as showcase tiles inside the dark grid; they are individual cards, not section backgrounds. | 超大**渐变聚光灯卡片**（紫、洋红、橙、珊瑚）作为暗色网格中的展示瓦片；它们是独立卡片，而非区块背景。 |
| Inter Variable with bespoke OpenType character variants (`cv01/05/09/11`, `ss03/ss07`, `dlig`) used everywhere body type appears — the typographic voice is unmistakable. | 正文处处使用带 OpenType 字符变体（`cv01/05/09/11`、`ss03/ss07`、`dlig`）的 Inter Variable——字体个性鲜明。 |
| Border radius scale runs from 4px utility chips up to 100px pills and full circles, with 15–20px the default for cards and 30px for atmospheric gradient cards. | 圆角从 4px 实用芯片到 100px 药丸与正圆；卡片默认 15–20px，氛围渐变卡片 30px。 |
| A single chromatic accent `{colors.accent-blue}` reserved for hyperlinks, focus, and selection — never decorative. | 单一彩色强调色 `{colors.accent-blue}` 专用于链接、聚焦与选中——不作装饰。 |

---

## Colors / 色彩

> **EN:** Source pages: framer.com (home), /ai/, /startups/, /marketplace/templates/nudge/, /gallery/a16z-speedrun-×-tonik, /pricing.
>
> **中文：** 来源页面：framer.com（首页）、/ai/、/startups/、/marketplace/templates/nudge/、/gallery/a16z-speedrun-×-tonik、/pricing。

### Brand & Accent / 品牌与强调色

| EN | 中文 |
|---|---|
| **Pure White** (`{colors.primary}`): The brand primary surface. Every primary CTA pill, every display headline, every body line on canvas. | **纯白**（`{colors.primary}`）：品牌主表面。所有主 CTA 药丸、展示标题、画布上的正文行。 |
| **Sky Blue** (`{colors.accent-blue}`): The single chromatic accent. Hyperlinks, focused-input rings, and a few selection states. Never used for backgrounds or as a brand fill. | **天蓝**（`{colors.accent-blue}`）：唯一彩色强调色。超链接、输入聚焦环及少量选中态。从不用于背景或品牌填充。 |

### Surface / 表面

| EN | 中文 |
|---|---|
| **Canvas** (`{colors.canvas}`): Default page background — near-black with a faint warmth. Footer, pricing, hero, and FAQ all sit on it. | **画布**（`{colors.canvas}`）：默认页面背景——近黑略带暖调。页脚、定价、主视觉、FAQ 均在其上。 |
| **Surface 1** (`{colors.surface-1}`): One step above canvas — pricing cards, secondary buttons, mockup tiles. | **表面 1**（`{colors.surface-1}`）：比画布高一层——定价卡、次要按钮、样机瓦片。 |
| **Surface 2** (`{colors.surface-2}`): Two steps above — featured pricing card, hero pill backdrop, selected pricing tab. | **表面 2**（`{colors.surface-2}`）：再高一层——推荐定价卡、主视觉药丸衬底、选中定价标签。 |
| **Hairline** (`{colors.hairline}`): 1px borders on input groups, comparison-table dividers. | **发丝线**（`{colors.hairline}`）：输入组 1px 边框、对比表分隔线。 |
| **Hairline Soft** (`{colors.hairline-soft}`): Subtler dividers — between FAQ rows and footer column rules. | **软发丝线**（`{colors.hairline-soft}`）：更淡分隔——FAQ 行之间、页脚列规则线。 |
| **Inverse Canvas** (`{colors.inverse-canvas}`): Pure white — used as the surface of light-on-dark pill CTAs and a small set of light-mode template thumbnails embedded in the showcase grid. | **反色画布**（`{colors.inverse-canvas}`）：纯白——用于暗底亮字药丸 CTA 表面，以及展示网格中少量浅色模板缩略图。 |

### Text / 文字

| EN | 中文 |
|---|---|
| **Ink** (`{colors.ink}`): All headline and emphasized body type — pure white. | **墨色**（`{colors.ink}`）：所有标题与强调正文——纯白。 |
| **Ink Muted** (`{colors.ink-muted}`): Secondary type — gray (#999999) used for meta info, footer columns, comparison-row labels, deselected pricing tabs. Hierarchy on the dark canvas is carried by ink → ink-muted contrast, not by weight changes. | **弱墨色**（`{colors.ink-muted}`）：次要文字——灰色 (#999999)，用于元信息、页脚列、对比行标签、未选中定价标签。暗色画布上的层级靠 ink → ink-muted 对比，而非字重变化。 |

### Semantic / 语义色

| EN | 中文 |
|---|---|
| **Success Green** (`{colors.semantic-success}`): Pricing comparison-table checkmarks. Glyph fill, not surface. | **成功绿**（`{colors.semantic-success}`）：定价对比表勾选标记。字形填充，非表面色。 |

### Brand Gradient (signature) / 品牌渐变（标志性）

| EN | 中文 |
|---|---|
| **Gradient Magenta** (`{colors.gradient-magenta}`): Spotlight card variant. | **渐变洋红**（`{colors.gradient-magenta}`）：聚光灯卡片变体。 |
| **Gradient Violet** (`{colors.gradient-violet}`): Spotlight card variant — most common. | **渐变紫**（`{colors.gradient-violet}`）：聚光灯卡片变体——最常见。 |
| **Gradient Orange** (`{colors.gradient-orange}`): Spotlight card variant — sunset wash. | **渐变橙**（`{colors.gradient-orange}`）：聚光灯卡片变体——日落晕染。 |
| **Gradient Coral** (`{colors.gradient-coral}`): Spotlight card variant — coral/pink. | **渐变珊瑚**（`{colors.gradient-coral}`）：聚光灯卡片变体——珊瑚/粉。 |

**EN:** These four sit as oversized atmospheric tiles inside otherwise monochrome card grids — a dark canvas with one or two glowing spotlight cards is a recurring page signature.

**中文：** 这四种颜色作为超大氛围瓦片，嵌在 otherwise 单色的卡片网格中——暗色画布配一两张发光聚光灯卡片，是反复出现的页面签名。

---

## Typography / 字体排版

### Font Family / 字体族

| EN | 中文 |
|---|---|
| **GT Walsheim Framer Medium** / **GT Walsheim Medium** — Framer's display typeface. Geometric, slightly humanist, very confident at large sizes with extreme negative tracking. Fallbacks: `GT Walsheim Medium Placeholder` system font. | **GT Walsheim Framer Medium** / **GT Walsheim Medium**——Framer 展示字体。几何、略人文，大号极负 tracking 时非常自信。回退：`GT Walsheim Medium Placeholder` 系统字体。 |
| **Inter Variable** — System body typeface. Used with extensive OpenType character variants: `cv01` (alternate "1"), `cv05` (alternate "g"), `cv09` (alternate "i" / "l"), `cv11` (alternate "0"), `ss03` / `ss07` stylistic sets, `dlig` discretionary ligatures, and `tnum` for numerics in tabular contexts. The result is a body voice that feels bespoke without commissioning a custom face. | **Inter Variable**——系统正文字体。大量使用 OpenType 字符变体：`cv01`（备用「1」）、`cv05`（备用「g」）、`cv09`（备用「i」/「l」）、`cv11`（备用「0」）、`ss03`/`ss07` 风格集、`dlig`  discretionary 连字，表格场景用 `tnum`。正文语感像定制，无需单独委外字体。 |
| **Inter** — Used selectively for `{typography.headline}` (the 22px / 20px tier). The non-variable cut catches small tracking targets that the variable file rounds. | **Inter**——选择性用于 `{typography.headline}`（22px / 20px 档）。非可变版本能精确命中 variable 文件会四舍五入的小字距目标。 |

### Hierarchy / 层级

| Token | Size | Weight | Line Height | Letter Spacing | Use (EN) | 用途（中文） |
|---|---|---|---|---|---|---|
| `{typography.display-xxl}` | 110px | 500 | 0.85 | -5.5px | Largest hero headline (home, AI page) | 最大主视觉标题（首页、AI 页） |
| `{typography.display-xl}` | 85px | 500 | 0.95 | -4.25px | Section opener headlines | 区块开篇标题 |
| `{typography.display-lg}` | 62px | 500 | 1.00 | -3.1px | Sub-section openers | 子区块开篇 |
| `{typography.display-md}` | 32px | 500 | 1.13 | -1.0px | Card titles, smaller display | 卡片标题、较小展示级 |
| `{typography.headline}` | 22px | 700 | 1.20 | -0.8px | Pricing tier headlines, FAQ category titles | 定价档位标题、FAQ 分类标题 |
| `{typography.subhead}` | 24px | 400 | 1.30 | -0.01px | Lead body next to display headlines | 展示标题旁的引导正文 |
| `{typography.body-lg}` | 18px | 400 | 1.30 | -0.18px | Hero subhead, lead paragraphs | 主视觉副标题、引导段落 |
| `{typography.body}` | 15px | 400 | 1.30 | -0.15px | Default body, card descriptions | 默认正文、卡片描述 |
| `{typography.body-sm}` | 14px | 500 | 1.40 | -0.14px | Pricing comparison rows, dense data | 定价对比行、密集数据 |
| `{typography.caption}` | 13px | 500 | 1.20 | -0.13px | Eyebrows, footer columns, meta | 眉题、页脚列、元信息 |
| `{typography.micro}` | 12px | 400 | 1.20 | -0.12px | Disclaimer, footnote | 免责声明、脚注 |
| `{typography.button}` | 14px | 500 | 1.0 | -0.14px | Pill buttons | 药丸按钮 |

### Principles / 原则

| EN | 中文 |
|---|---|
| **Letter-spacing scales with size, hard.** Display-xxl pulls -5.5px (5% of size); body sticks to about -1% (-0.15px on 15px). The result: posters at the top, comfortable reading at body. | **字距随字号硬性缩放。** display-xxl 为 -5.5px（约字号 5%）；正文约 -1%（15px 上 -0.15px）。顶部像海报，正文舒适阅读。 |
| **OpenType character variants are the brand voice.** Switching off `cv11`, `ss03`, etc. visibly changes the body voice — the brand depends on them. | **OpenType 字符变体即品牌语气。** 关闭 `cv11`、`ss03` 等会明显改变正文语感——品牌依赖它们。 |
| **Weight stays in a narrow band.** Display sits at 500, body at 400, body-sm/caption at 500. Hierarchy is carried by size + tracking, not by 700/900 ramps. | **字重区间窄。** 展示 500、正文 400、body-sm/caption 500。层级靠字号 + 字距，而非 700/900 阶梯。 |
| **Tight line-heights everywhere.** Even body runs at 1.30 — Framer's editorial tone is denser than typical SaaS marketing. | **行高普遍偏紧。** 正文亦为 1.30——Framer 编辑语气比典型 SaaS 营销更密。 |

### Note on Font Substitutes / 字体替代说明

**EN:** If implementing without GT Walsheim Medium, suitable open-source substitutes include **Mona Sans**, **Geist**, or **Inter** at weight 600–700 with manually tightened tracking. Mona Sans's hairline weights at 100–300 are particularly close to Framer's cleaner section openers. Inter Variable is open-source — keep it as-is and preserve the documented OpenType variants.

**中文：** 若无 GT Walsheim Medium，可用开源替代：**Mona Sans**、**Geist**，或字重 600–700 并手动收紧 tracking 的 **Inter**。Mona Sans 100–300 细字重尤其接近 Framer 较干净的区块开篇。Inter Variable 为开源——保持原样并保留文档中的 OpenType 变体。

---

## Layout / 布局

### Spacing System / 间距体系

| EN | 中文 |
|---|---|
| **Base unit**: 5px (Framer uses non-standard 5/10/15/20/30 increments rather than the more common 4/8/16/24). | **基础单位**：5px（Framer 用非标准 5/10/15/20/30 递增，而非常见的 4/8/16/24）。 |
| **Tokens (front matter)**: `{spacing.hair}` 1px · `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 15px · `{spacing.lg}` 20px · `{spacing.xl}` 30px · `{spacing.xxl}` 40px · `{spacing.section}` 96px. | **Token（front matter）**：同上数值。 |
| Card interior padding: `{spacing.lg}` 20px on pricing cards; `{spacing.xl}` 30px on gradient spotlight cards. | 卡片内边距：定价卡 `{spacing.lg}` 20px；渐变聚光灯卡 `{spacing.xl}` 30px。 |
| Pill button padding: 10px vertical · 15px horizontal — `{components.button-primary}`. | 药丸按钮内边距：上下 10px · 左右 15px——`{components.button-primary}`。 |
| Section padding (vertical): roughly `{spacing.section}` 96px on home; tighter (~64px) on pricing comparison. | 区块垂直内边距：首页约 `{spacing.section}` 96px；定价对比更紧（约 64px）。 |

### Grid & Container / 网格与容器

| EN | 中文 |
|---|---|
| Max content width sits around the 1199px breakpoint, with side gutters that scale toward `{spacing.xl}` on desktop. | 最大内容宽度约在 1199px 断点，桌面侧边距趋向 `{spacing.xl}`。 |
| Card grids on the home gallery use 2-up at desktop, collapsing to 1-up below 810px. | 首页画廊卡片网格桌面 2 列，810px 以下 1 列。 |
| Pricing tier grid is 4-up across the documented breakpoints; comparison table beneath it uses fixed-width left column with horizontally scrolling tier columns at narrow widths. | 定价档位网格在文档断点内为 4 列；下方对比表左列固定宽，窄屏档位列横向滚动。 |

### Whitespace Philosophy / 留白哲学

**EN:** The dark canvas IS the whitespace. Where lighter brands lean on white air to separate sections, Framer leans on long stretches of black with a single oversized statement floating in the middle. Sections separate by mode change: a band of charcoal cards, then a band of black with a gradient spotlight, then back to charcoal — like cuts in a dark film.

**中文：** 暗色画布本身就是留白。浅色品牌靠白空分隔区块，Framer 靠长段黑底中间一句超大陈述。区块靠模式切换分隔：一段炭灰卡片、一段带渐变聚光灯的黑底、再回到炭灰——像暗色影片的剪辑。

---

## Elevation & Depth / 层级与深度

| Level | Treatment (EN) | 处理（中文） | Use (EN) | 用途（中文） |
|---|---|---|---|---|
| 0 (flat) | No shadow, no border | 无阴影、无边框 | Default for canvas-mounted display type, FAQ rows, footer | 画布展示字、FAQ 行、页脚默认 |
| 1 (charcoal) | `{colors.surface-1}` lift on canvas | 画布上 `{colors.surface-1}` 抬升 | Pricing cards, mockup tiles, secondary buttons | 定价卡、样机瓦片、次要按钮 |
| 2 (light-edge) | `rgba(255,255,255,0.10)` 0.5px top edge + `rgba(0,0,0,0.25)` 0px 10px 30px drop | 顶边 0.5px 亮边 + 下落阴影 | Floating product cards, modal cards | 浮动产品卡、模态卡 |
| 3 (selected) | `rgba(0,153,255,0.15)` 0px 0px 0px 1px ring | 1px 蓝 tint 环 | Focused inputs, selected option | 聚焦输入、选中项 |

**EN:** Four shadow signatures recur across the homepage: a 1px subtle drop, a translucent blue ring, a thick near-black 2px outline (used as the active-element marker on sub-nav), and the layered light-edge + drop-shadow used for floating cards.

**中文：** 首页反复出现四种阴影签名：1px 轻微下落、半透明蓝环、近黑 2px 粗描边（子导航当前项标记）、以及浮动卡用的亮边 + 下落阴影分层。

### Decorative Depth / 装饰性深度

| EN | 中文 |
|---|---|
| **Gradient spotlight cards** are the dominant depth device — color saturation against black canvas substitutes for shadow-driven elevation. | **渐变聚光灯卡片**是主要深度手段——黑底上的色彩饱和度替代阴影抬升。 |
| **Layered product mockups** (browser frames containing live Framer-built sites) sit inside `{colors.surface-1}` cards with the level-2 light-edge treatment. | **分层产品样机**（浏览器框内嵌 Framer 站点）置于 `{colors.surface-1}` 卡内，采用 level-2 亮边处理。 |
| **Subtle blue ring (focus / selected)** is the only chromatic depth signal — used to mark the active state of input groups and pricing tier toggles without changing the underlying surface. | **淡蓝环（聚焦/选中）**是唯一彩色深度信号——标记输入组与定价切换的激活态，不改变底表面。 |

---

## Shapes / 形状

### Border Radius Scale / 圆角刻度

**EN:** Framer's extracted radius set is unusually granular (1px, 4px, 5px, 6px, 8px, 10px, 12px, 15px, 20px, 30px, 40px, 100px). The named scale below picks the levels the marketing surface actually consumes.

**中文：** Framer 提取的圆角集异常细密（1px 至 100px 等多档）。下表命名刻度为营销面实际使用的层级。

| Token | Value | Use (EN) | 用途（中文） |
|---|---|---|---|
| `{rounded.xs}` | 4px | Small chip / utility radius | 小芯片/实用圆角 |
| `{rounded.sm}` | 6px | Inline tag, badge | 行内标签、徽章 |
| `{rounded.md}` | 10px | Form input, list item | 表单输入、列表项 |
| `{rounded.lg}` | 15px | Template card thumbnails | 模板卡缩略图 |
| `{rounded.xl}` | 20px | Pricing cards, mockup tiles | 定价卡、样机瓦片 |
| `{rounded.xxl}` | 30px | Gradient spotlight cards, oversized panels | 渐变聚光灯卡、超大面板 |
| `{rounded.pill}` | 100px | All primary text CTAs | 所有主文字 CTA |
| `{rounded.full}` | 9999px | Circular icon buttons, avatar circles | 圆形图标按钮、头像圆 |

### Photography & Illustration Geometry / 摄影与插图几何

| EN | 中文 |
|---|---|
| Embedded site mockups (browser-chromed previews of Framer-built sites) sit in `{rounded.xl}` 20px tiles with `{spacing.md}` 15px interior padding. | 内嵌站点样机（浏览器框预览）置于 `{rounded.xl}` 20px 瓦片，内边距 `{spacing.md}` 15px。 |
| Gradient spotlight cards use `{rounded.xxl}` 30px corners — softer than the 20px content cards by design, to make them feel like atmospheric panels rather than tighter UI. | 渐变聚光灯卡用 `{rounded.xxl}` 30px 角——有意比 20px 内容卡更软，像氛围面板而非紧凑 UI。 |
| Icon glyphs and sub-nav glyphs render in `{rounded.full}` circles at 32–40px sizes. | 图标与子导航字形在 32–40px `{rounded.full}` 圆中渲染。 |

---

## Components / 组件

### Buttons / 按钮

**`button-primary`** — White pill on dark canvas. The primary CTA across home, pricing, AI, and gallery pages.
**`button-primary`** — 暗底上的白色药丸。首页、定价、AI、画廊等页的主 CTA。

- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, padding 10px 15px, rounded `{rounded.pill}`.
- 背景 `{colors.primary}`，文字 `{colors.on-primary}`，字体 `{typography.button}`，内边距 10px 15px，圆角 `{rounded.pill}`。
- Pressed state lives in `button-primary-pressed` (the live site uses a transform-scale shrink rather than a darkened fill).
- 按下态在 `button-primary-pressed`（线上用缩放而非加深填充）。

**`button-secondary`** — Charcoal pill. Used for secondary navigation actions ("Sign in", "Talk to sales") and as the visual counterpart to the primary pill.
**`button-secondary`** — 炭灰药丸。用于次要导航（「Sign in」「Talk to sales」），与主药丸视觉配对。

- Background `{colors.surface-1}`, text `{colors.ink}`, type `{typography.button}`, padding 10px 15px, rounded `{rounded.pill}`.

**`button-translucent`** — Translucent / lifted secondary used on top of busy backgrounds (gallery hero, gradient cards).
**`button-translucent`** — 半透明/抬升次要按钮，用于复杂背景（画廊主视觉、渐变卡）。

- Background `{colors.surface-2}`, text `{colors.ink}`, type `{typography.button}`, rounded `{rounded.xxl}`, padding 8px 14px.

**`button-icon-circular`** — 40px circle for inline icon actions (carousel arrows, social links).
**`button-icon-circular`** — 40px 圆形行内图标操作（轮播箭头、社交链接）。

- Background `{colors.surface-1}`, text `{colors.ink}`, rounded `{rounded.full}`, size 40px.

### Pricing Tabs / 定价标签

**`pricing-tab-default`** + **`pricing-tab-selected`** — The pill-toggle that switches between Basic / Pro / Business / Enterprise on `/pricing`.
**`pricing-tab-default`** + **`pricing-tab-selected`** — `/pricing` 上 Basic / Pro / Business / Enterprise 的药丸切换。

- Default: `{colors.canvas}` background, `{colors.ink-muted}` text, rounded `{rounded.pill}`.
- 默认：`{colors.canvas}` 背景，`{colors.ink-muted}` 文字，`{rounded.pill}`。
- Selected: `{colors.surface-2}` background, `{colors.ink}` text — selected = lift, not color. Surface depth communicates "active" without needing a chromatic fill.
- 选中：`{colors.surface-2}` 背景，`{colors.ink}` 文字——选中 = 抬升而非变色。表面深度表达「激活」，无需彩色填充。

### Inputs & Forms / 输入与表单

**`text-input`** + **`text-input-focused`** — Form fields on `/pricing` (seat-count, currency switcher) and the in-product preview surfaces.
**`text-input`** + **`text-input-focused`** — `/pricing` 表单（席位数、货币切换）及产品内预览表面。

- Background `{colors.surface-1}`, text `{colors.ink}`, type `{typography.body}`, rounded `{rounded.md}`, padding 10px 14px.
- Focused state retains the same surface; the focus ring is the level-3 blue-tinted shadow `rgba(0,153,255,0.15)` 0 0 0 1px.
- 聚焦态保持同表面；聚焦环为 level-3 蓝 tint 阴影 `rgba(0,153,255,0.15)` 0 0 0 1px。

### Cards & Containers / 卡片与容器

| Component | EN | 中文 |
|---|---|---|
| `pricing-card` | Each tier on `/pricing`. Background `{colors.surface-1}`, rounded `{rounded.xl}`, padding 24px. | `/pricing` 各档位。背景 `{colors.surface-1}`，圆角 `{rounded.xl}`，内边距 24px。 |
| `pricing-card-featured` | The Pro tier (visually emphasized). Background `{colors.surface-2}` — lift is one surface step up, no chromatic outline. | Pro 档（视觉强调）。背景 `{colors.surface-2}`——抬升一层，无彩色描边。 |
| `template-card` | Thumbnail tile in home "Built with Framer" gallery and `/marketplace`. `{rounded.lg}`, padding 12px. | 首页「Built with Framer」画廊与 `/marketplace` 缩略图瓦片。`{rounded.lg}`，内边距 12px。 |
| `product-mockup-tile` | Larger tile framing live product UI mock. `{rounded.xl}`, padding 16px. | 框住 live 产品 UI 样机的大瓦片。`{rounded.xl}`，内边距 16px。 |

### Gradient Spotlight Cards (signature) / 渐变聚光灯卡片（标志）

**EN:** The defining decorative surface of Framer's marketing — oversized atmospheric tiles dropped into otherwise monochrome card grids.

**中文：** Framer 营销的定义性装饰表面——超大氛围瓦片投入单色卡片网格。

| Variant | EN | 中文 |
|---|---|---|
| `gradient-spotlight-card` | Violet ground (most common). `{colors.gradient-violet}`, `{rounded.xl}`, padding 32px. | 紫底（最常见）。同上 token。 |
| `gradient-spotlight-card-magenta` | Magenta-pink ground. | 洋红粉底。 |
| `gradient-spotlight-card-orange` | Sunset-orange wash. | 日落橙晕染。 |
| (coral) | Same shape with `{colors.gradient-coral}`. | 同形态，`{colors.gradient-coral}`。 |

### Comparison & FAQ / 对比与 FAQ

| Component | EN | 中文 |
|---|---|---|
| `feature-row` | `{colors.canvas}` background, `{colors.ink}` text. Header rows. | 表头行。 |
| `comparison-row` | `{colors.ink-muted}` text, `{typography.body-sm}`, 1px `{colors.hairline-soft}` underlines. | 数据行，弱墨色，细下划线。 |
| `faq-row` | Accordion line on pricing FAQ. `{rounded.md}`, padding 24px. | 定价页 FAQ 手风琴行。`{rounded.md}`，内边距 24px。 |

### Navigation / 导航

**`top-nav`** — Sticky bar on `{colors.canvas}` with the Framer wordmark left, primary nav links centered, and a `button-secondary` ("Sign in") + `button-primary` ("Get started for free") pair right.
**`top-nav`** — `{colors.canvas}` 粘性顶栏：左 Logo、中主导航、右 `button-secondary`（Sign in）+ `button-primary`（Get started for free）。

- Height 56px. Mobile: hamburger; two pill CTAs collapse to single primary pill on the bar.
- 高度 56px。移动端：汉堡菜单；双药丸 CTA 收成栏上单一主药丸。

### Footer / 页脚

**`footer`** — Dense link grid on `{colors.canvas}` with the Framer wordmark left and 5–6 columns of caption-sized links.
**`footer`** — `{colors.canvas}` 上密集链接网格：左 Logo，5–6 列 caption 级链接。

- Background `{colors.canvas}`, text `{colors.ink-muted}`, type `{typography.caption}`, padding 64px 32px.

---

## Do's and Don'ts / 宜忌

### Do / 宜

| EN | 中文 |
|---|---|
| Reserve `{colors.primary}` (white) and `{colors.canvas}` (near-black) as the system's two anchor surfaces. Every band of the page chooses one or the other. | 以 `{colors.primary}`（白）与 `{colors.canvas}`（近黑）为两大锚定表面；每段页面二选一。 |
| Push display-size letter-spacing aggressively negative — `{typography.display-xxl}` at -5.5px is the brand signature, not a stylistic accident. | 展示级字距极力负值——`{typography.display-xxl}` -5.5px 是品牌签名，非偶然风格。 |
| Use `{colors.accent-blue}` only for hyperlinks, focus rings, and selected indicators. Never as a background or button fill. | `{colors.accent-blue}` 仅用于链接、聚焦环、选中指示；不作背景或按钮填充。 |
| Drop one or two `gradient-spotlight-card` variants into a card grid; they are the brand's atmosphere device. Don't overdo it — three or more in the same viewport reads as a moodboard, not a system. | 卡片网格中放一两张 `gradient-spotlight-card`；同视口三张以上像情绪板而非体系。 |
| Compose every CTA as a pill (`{rounded.pill}`); secondary actions live as charcoal pills, never as bordered ghost buttons. | 所有 CTA 用药丸（`{rounded.pill}`）；次要操作为炭灰药丸，不用描边幽灵按钮。 |
| Keep body type Inter Variable with character variants `cv01`, `cv05`, `cv09`, `cv11`, `ss03`, `ss07` enabled — the brand voice depends on them. | 正文保持 Inter Variable 并启用上述变体——品牌语气依赖它们。 |
| Use surface lift (canvas → surface-1 → surface-2) to mark hierarchy on dark, not opacity changes on white type. | 暗色上用表面抬升（canvas → surface-1 → surface-2）表层级，而非改白字透明度。 |

### Don't / 忌

| EN | 中文 |
|---|---|
| Don't ship a light-mode marketing page. Framer's identity is dark. | 不要出浅色营销页。Framer 身份即暗色。 |
| Don't introduce mid-tone gray text outside `{colors.ink-muted}`. The hierarchy is binary: `ink` or `ink-muted`. | 除 `{colors.ink-muted}` 外不要引入中灰文字。层级二元：ink 或 ink-muted。 |
| Don't use `{colors.accent-blue}` as a brand fill (e.g., a blue CTA pill). The blue is a signal color, not a surface. | 不要用 `{colors.accent-blue}` 作品牌填充（如蓝 CTA 药丸）。蓝是信号色，非表面色。 |
| Don't square off CTAs. Pill (`{rounded.pill}`) or full circle is the brand vocabulary. | 不要把 CTA 做成方角。药丸或正圆是品牌词汇。 |
| Don't reduce the negative letter-spacing on display sizes "for accessibility". The compression is intrinsic to the brand voice; reduce the SIZE if needed, but keep the percentage. | 不要为「无障碍」削弱展示级负字距；需时缩小字号，保持百分比。 |
| Don't apply gradient backgrounds to whole sections. Gradients are CARDS, not section grounds. | 不要把渐变铺整段背景。渐变是卡片，非区块底。 |
| Don't combine more than one chromatic accent. The palette is monochrome plus one blue plus the gradient family — not "blue, green, and red". | 不要多个彩色强调色并存。调色板是单色 + 一蓝 + 渐变族。 |

---

## Responsive Behavior / 响应式行为

### Breakpoints / 断点

| Name | Width | Key Changes (EN) | 关键变化（中文） |
|---|---|---|---|
| Desktop | 1199px | Default desktop layout | 默认桌面布局 |
| Tablet | 810px | Card grids collapse 4-up → 2-up; nav becomes hamburger | 卡片 4→2 列；导航变汉堡 |
| Mobile-Lg | 809px | Pricing comparison table becomes per-tier accordion | 定价对比表变分档手风琴 |
| Mobile-XS | 98px | Smallest documented breakpoint — single-column everything | 最小文档断点——全单列 |

### Touch Targets / 触控目标

| EN | 中文 |
|---|---|
| Pill buttons maintain a minimum 44px tap height across all viewports. | 药丸按钮全视口最小点击高度 44px。 |
| Circular icon buttons are 40px on desktop and grow to 44px on touch viewports. | 圆形图标按钮桌面 40px，触控视口 44px。 |
| Pricing-tab pills hold ≥40px tap height; below 810px they may collapse into a horizontal-scroll row. | 定价标签药丸 ≥40px；810px 以下可横向滚动一行。 |

### Collapsing Strategy / 折叠策略

| EN | 中文 |
|---|---|
| **Nav**: horizontal nav collapses to hamburger below 810px. `button-primary` stays visible on the bar. | **导航**：810px 以下汉堡；栏上保留 `button-primary`。 |
| **Card grids**: gallery grids go 2-up → 1-up on mobile. Gradient spotlight cards retain `{rounded.xxl}` at every viewport. | **卡片网格**：画廊 2→1 列；渐变聚光灯卡各视口保持 `{rounded.xxl}`。 |
| **Pricing comparison table**: collapses into per-tier accordions below 810px. | **定价对比表**：810px 以下分档手风琴。 |
| **Display type**: `display-xxl` 110px scales down toward `display-lg` 62px on tablet and `display-md` 32px on mobile, preserving percentage-negative letter-spacing. | **展示字体**：110px 在平板向 62px、手机向 32px 缩放，保持负字距百分比。 |

### Image Behavior / 图像行为

| EN | 中文 |
|---|---|
| Embedded product mockups maintain their aspect ratio and never crop. | 内嵌产品样机保持宽高比，不裁剪。 |
| Gradient spotlight cards keep their gradient orientations across breakpoints. | 渐变聚光灯卡各断点保持渐变方向。 |

---

## Iteration Guide / 迭代指南

| # | EN | 中文 |
|---|---|---|
| 1 | Focus on ONE component at a time and reference it by its `components:` token name. | 一次只改一个组件，用 `components:` token 名引用。 |
| 2 | When introducing a new section, decide first which surface lift it lives on — canvas for hero/FAQ, surface-1 for cards, surface-2 for featured cards. | 新区块先定表面抬升层级——主视觉/FAQ 用 canvas，卡片用 surface-1，推荐卡用 surface-2。 |
| 3 | Default body to `{typography.body}` with all documented OpenType variants; reach for `{typography.subhead}` only inside spotlight cards. | 正文默认 `{typography.body}` 及全部 OpenType 变体；仅聚光灯卡内用 `{typography.subhead}`。 |
| 4 | Run `npx @google/design.md lint DESIGN.md` after edits. | 编辑后运行 `npx @google/design.md lint DESIGN.md`。 |
| 5 | Add new variants as separate component entries (`-pressed`, `-featured`, `-selected`) — do not bury them in prose. | 新变体单独建组件项，不要只写在正文里。 |
| 6 | Treat `{colors.accent-blue}` as a single-shot signal color: hyperlinks, focus, and selection — that's it. | `{colors.accent-blue}` 仅作一次性信号色：链接、聚焦、选中。 |
| 7 | Gradient spotlight cards are scarce by design. One or two per long page is the spec; three is a moodboard. | 渐变聚光灯卡刻意稀缺；长页一两张为宜，三张即情绪板。 |

---

## Known Gaps / 已知缺口

| EN | 中文 |
|---|---|
| The exact gradient stops for the spotlight cards are derived from screenshot pixels rather than from CSS variables — treat documented `{colors.gradient-*}` hex values as base anchors, not as exact gradient specs. | 聚光灯卡精确渐变停靠点来自截图像素而非 CSS 变量——文档 hex 为锚点，非精确渐变规范。 |
| Form-field validation / error styling is not visible on the inspected pages because no error states render in the static screenshots. | 静态截图无错误态，故未记录表单校验/错误样式。 |
| Dark mode is the only mode — no light-mode adaptation is documented because the marketing site does not ship one. | 仅暗色模式——营销站无浅色版，故无浅色适配文档。 |
| The marketplace template detail page returned sparser CSS variable data; surface tokens for that page were inferred from home / gallery treatment. | 市场模板详情页 CSS 变量较稀疏；该页表面 token 由首页/画廊推断。 |

---

*Generated from `docs/FRAMER_DESIGN.md` — bilingual reference for implementation review.*
