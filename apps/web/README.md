# JW Keyboard Designer — Web

一款基于浏览器的**键盘键帽可视化设计工具**，支持多种 ANSI 布局、图层管理、键帽定制、贴图拖拽以及 PNG / SVG / JIG 治具多格式导出。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **多布局切换** | 内置 ANSI 60% / 68% / 81% / 87 TKL / 104 / 108 六种布局，JSON 驱动 |
| **图层系统** | 支持多图层键帽颜色与样式覆盖，可在图层面板自由管理 |
| **键帽定制** | 文字、字体、字重、颜色、渐变、边框、内边距、对齐等全面控制 |
| **批量编辑** | 框选或多选键帽后统一修改样式 |
| **画布贴图** | 拖拽图片到画布，支持自由变换与分层 |
| **撤销 / 重做** | Zustand + zundo 实现完整的操作历史（`Ctrl/⌘ + Z / Y`） |
| **PNG 导出** | 客户端直接导出当前画板为 PNG |
| **SVG 导出** | 服务端 opentype 将文字转曲为 `<path>`；无字体文件时保留 `<text>` |
| **JSON 导入 / 导出** | 设计数据序列化，方便保存与分享 |
| **JIG 治具生成** | 根据设计数据调用服务端 API，生成可用于生产的治具 SVG |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Next.js 16](https://nextjs.org/)（App Router + Turbopack） |
| UI | [React 19](https://react.dev/)、[Tailwind CSS 4](https://tailwindcss.com/) |
| 状态管理 | [Zustand 5](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo)（撤销/重做） |
| 手势交互 | [@use-gesture/react](https://use-gesture.netlify.app/)、[@react-spring/web](https://www.react-spring.dev/) |
| 颜色处理 | [colord](https://github.com/omgovich/colord) |
| 字体转曲 | [opentype.js](https://opentype.js.org/)（服务端 API Route） |
| 图标 | [lucide-react](https://lucide.dev/) |
| 共享组件 | `@workspace/ui`（基于 [shadcn/ui](https://ui.shadcn.com/)） |

---

## 目录结构

```
apps/web/
├── app/
│   ├── layout.tsx              # 根布局（字体注册、dark 模式）
│   ├── page.tsx                # / 营销首页
│   ├── design/
│   │   └── page.tsx            # /design 设计编辑器
│   └── api/
│       ├── generate-jig/       # POST — 生成 JIG 治具 SVG
│       └── texts-to-paths/     # POST — 批量文字转 SVG path
├── modules/
│   └── design/
│       ├── components/         # 工作区、画布、侧边栏等 UI 组件
│       ├── hooks/              # 视口、框选、平移、键帽编辑等 hooks
│       ├── store/              # Zustand store（designUiStore）
│       ├── lib/                # 导出、SVG 工具、渐变、几何计算
│       └── data/               # 布局 JSON、JIG 模板、示例设计
├── lib/
│   ├── fontAssets.ts           # 字体资源映射
│   └── jig/                    # JIG 生成与字体转 path 工具
└── public/fonts/               # woff2 供页面显示；ttf 供服务端转曲（Noto SC 仅 ttf）
```

---

## 快速开始

### 环境要求

- **Node.js** >= 20
- **pnpm** >= 9（`npm i -g pnpm`）

### 安装依赖

在 **monorepo 根目录**执行：

```bash
pnpm install
```

### 启动开发服务器

**启动所有应用**（推荐，Turbo 并行）：

```bash
pnpm dev
```

**仅启动 web**：

```bash
pnpm --filter web dev
# 或在 apps/web 目录下
pnpm dev
```

访问：
- `http://localhost:3000` — 产品首页
- `http://localhost:3000/design` — 设计编辑器

### 构建生产包

```bash
# monorepo 根目录
pnpm build

# 仅构建 web
pnpm --filter web build
pnpm --filter web start
```

### 代码检查

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript 类型检查
pnpm format      # Prettier 格式化
```

---

## 路由说明

| 路由 | 类型 | 说明 |
|------|------|------|
| `/` | 页面 | 产品落地页：Hero、功能介绍、87 键实时预览 |
| `/design` | 页面 | 键帽设计工作区（左侧栏 / 画布 / 右侧栏三栏布局） |
| `/api/generate-jig` | API Route | 接收设计 JSON，返回 JIG 治具 SVG 文件 |
| `/api/texts-to-paths` | API Route | 批量将键帽文字转为 SVG `<path>`，供 SVG 导出使用 |

> 设计器为桌面端优先（≥ 768px），移动端会提示切换到大屏设备。

---

## 内置键盘布局

| 布局 ID | 说明 |
|---------|------|
| `ansi-61` | 60% |
| `ansi-68` | 68% |
| `ansi-81` | 81% |
| `ansi-87` | TKL 87 键 |
| `ansi-104` | 全尺寸 104 键（默认） |
| `ansi-108` | 全尺寸 108 键 |

---

## Monorepo 结构

本项目使用 **pnpm workspaces + Turborepo** 管理：

```
jw-keyboard-designer/
├── apps/
│   ├── web/          # 本前端应用（Next.js）
│   └── api/          # 后端服务（NestJS）
└── packages/
    ├── ui/           # 共享 shadcn/ui 组件与全局样式
    ├── eslint-config/
    └── typescript-config/
```
