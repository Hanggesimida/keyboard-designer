# Keyboard Designer — Web

[English](README.md) | [简体中文](README.zh-CN.md)

浏览器端**键盘键帽可视化设计工具**：多种 ANSI 布局、图层、单键定制、画布贴图，以及 PNG / SVG / JSON / 治具导出。文字转曲与治具生成都在浏览器内完成。这是 monorepo 中的产品应用。

返回 [仓库 README](../../README.zh-CN.md)。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **多布局** | 内置 ANSI 60% / 68% / 81% / 87 TKL / 104 / 108 / 144，JSON 驱动 |
| **图层系统** | 多图层键帽颜色与样式覆盖，可在图层面板管理 |
| **键帽定制** | 文字、字体、字重、颜色、渐变、边框、内边距、对齐 |
| **批量编辑** | 框选或多选后统一改样式 |
| **画布贴图** | 拖拽图片到画布，自由变换与分层 |
| **撤销 / 重做** | Zustand + zundo（`Ctrl/⌘ + Z / Y`） |
| **PNG 导出** | 客户端直接导出当前画板 |
| **SVG 导出** | 浏览器内 opentype.js 将文字转曲为 `<path>`；无字体文件时保留 `<text>` |
| **JSON 导入 / 导出** | 设计数据序列化，方便保存与分享 |
| **JIG 治具** | 浏览器内根据设计数据生成生产用治具 SVG |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Next.js 16](https://nextjs.org/)（App Router + Turbopack） |
| UI | [React 19](https://react.dev/)、[Tailwind CSS 4](https://tailwindcss.com/) |
| 国际化 | [next-intl](https://next-intl.dev/) — 默认 `en`，`zh` 使用 `/zh` 前缀 |
| 状态 | [Zustand 5](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo) |
| 手势 | [@use-gesture/react](https://use-gesture.netlify.app/)、[@react-spring/web](https://www.react-spring.dev/) |
| 颜色 | [colord](https://github.com/omgovich/colord) |
| 转曲 / 治具 | 浏览器端 opentype.js（`lib/export/browser/`） |
| 图标 | [lucide-react](https://lucide.dev/) |
| 共享组件 | `@workspace/ui`（[shadcn/ui](https://ui.shadcn.com/)） |

---

## 目录结构

```
apps/web/
├── app/
│   ├── [locale]/               # 带语言前缀的页面（首页、/design 等）
│   └── layout.tsx              # 根布局
├── modules/
│   ├── home/                   # 营销落地页区块
│   └── design/
│       ├── components/         # 工作区、画布、侧边栏
│       ├── hooks/              # 视口、框选、平移、键帽编辑
│       ├── store/              # Zustand store
│       ├── lib/                # 导出、SVG、渐变、几何计算
│       └── data/               # 布局 JSON、治具模板
├── i18n/                       # next-intl 路由与请求配置
├── lib/
│   ├── export/                 # 浏览器转曲与治具
│   └── fonts/                  # 会话字体
├── messages/                   # en.json / zh.json 文案
└── public/                     # 图片、显示字体、模型
```

登录、个人中心、管理后台、结账等路由仍在 `app/` 下，但会重定向到 `/design`（以及 `/zh/design`）。恢复后端见 [legacy/README.zh-CN.md](../../legacy/README.zh-CN.md)。

---

## 快速开始

### 环境要求

- **Node.js** >= 22
- **pnpm** 11.12.0（建议 `corepack enable`）

无需启动后端。

### 安装依赖

在 **monorepo 根目录**执行：

```bash
pnpm install
```

### 开发服务器

```bash
pnpm dev
```

- `http://localhost:3000` — 首页（英文）
- `http://localhost:3000/zh` — 首页（简体中文）
- `http://localhost:3000/design` — 设计器
- `http://localhost:3000/zh/design` — 简体中文设计器

### 生产构建

```bash
pnpm build
pnpm start
```

### 检查

```bash
pnpm lint
pnpm typecheck
pnpm test
```

---

## 路由

| 路由 | 说明 |
|------|------|
| `/` · `/zh` | 落地页：Hero、功能介绍、FAQ |
| `/design` · `/zh/design` | 键帽工作区（左侧栏 / 画布 / 右侧栏） |

设计器为桌面端优先（≥ 768px）。小屏会提示切换到更大的设备。

---

## 内置键盘布局

| 布局 ID | 说明 |
|---------|------|
| `ansi-61` | 60% |
| `ansi-68` | 68% |
| `ansi-81` | 81% |
| `ansi-87` | TKL 87 键 |
| `ansi-104` | 全尺寸 104 键 |
| `ansi-108` | 全尺寸 108 键（默认） |
| `ansi-144` | 144 键 |
