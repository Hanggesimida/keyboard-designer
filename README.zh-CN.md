# Keyboard Designer

[English](README.md) | [简体中文](README.zh-CN.md)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/images/hero_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="apps/web/public/images/hero_light.png">
    <img alt="Keyboard Designer 键帽设计编辑器" src="apps/web/public/images/hero_light.png" width="900">
  </picture>
</p>

Keyboard Designer 是一个浏览器端键帽设计器。打开页面、选择布局、编辑颜色与文字，即可导出 PNG、SVG、JSON 与生产用治具文件——无需注册、无需后端、无需云端存储。

应用已部署在 [Vercel](https://vercel.com/) 上，打开 **[kbd.weihangli.dev](https://kbd.weihangli.dev)** 即可查看并使用，无需本地安装。

- [kbd.weihangli.dev](https://kbd.weihangli.dev) — 英文
- [kbd.weihangli.dev/zh](https://kbd.weihangli.dev/zh) — 简体中文
- [kbd.weihangli.dev/design](https://kbd.weihangli.dev/design) — 设计器

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/images/feature_dark.png">
    <source media="(prefers-color-scheme: light)" srcset="apps/web/public/images/feature_light.png">
    <img alt="所见即所得键帽编辑器" src="apps/web/public/images/feature_light.png" width="900">
  </picture>
</p>

## 能做什么

- **实时编辑** — 拖拽平移、框选按键，颜色、字符与图标即时预览。
- **布局** — 内置 ANSI 60% / 68% / 81% / TKL 87 / 104 / 108 / 144，由 JSON 驱动。
- **图层** — 叠放键帽颜色与样式覆盖，在图层面板中管理。
- **键帽样式** — 文字、字体、字重、纯色、渐变、边框、内边距与对齐。
- **批量编辑** — 框选或多选后统一改样式。
- **画布贴图** — 把图片拖到画板上，自由变换并与键帽分层。
- **撤销 / 重做** — 当前会话完整历史（`Ctrl/⌘ + Z / Y`）。
- **导出** — PNG、SVG（浏览器内用 opentype.js 文字转曲）、JSON、治具 SVG。不请求 API。
- **会话字体** — 临时加载 TTF/OTF，只存在内存中，刷新后消失。
- **English / 简体中文** — 界面语言，默认英文。

没有账号、用户中心或管理后台。设计状态只存在于当前浏览器标签页。**刷新、关闭标签页或浏览器崩溃都会丢失未导出的修改。** 保存方式是手动导出 JSON，并把文件纳入自己的备份流程。

产品不需要 API、PostgreSQL、Redis、Prisma、JWT、邮件、对象存储或支付配置。

## 技术栈

| 类别 | 选型 |
|------|------|
| 应用 | [Next.js 16](https://nextjs.org/)（App Router + Turbopack） |
| UI | [React 19](https://react.dev/)、[Tailwind CSS 4](https://tailwindcss.com/)、[shadcn/ui](https://ui.shadcn.com/) |
| 国际化 | [next-intl](https://next-intl.dev/)（默认 `en`，`zh` 带前缀） |
| 状态 | [Zustand](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo) |
| 手势 | [@use-gesture/react](https://use-gesture.netlify.app/)、[@react-spring/web](https://www.react-spring.dev/) |
| 导出 | 浏览器端 [opentype.js](https://opentype.js.org/)，见 `apps/web/lib/export/browser/` |
| Monorepo | pnpm workspaces + [Turborepo](https://turbo.build/) |

## 仓库结构

```text
keyboard-designer/
├── apps/
│   └── web/                 # Next.js 产品（首页 + /design 编辑器）
├── packages/
│   ├── ui/                  # 共享 shadcn/ui 组件与样式
│   ├── eslint-config/       # 共享 ESLint 配置
│   └── typescript-config/   # 共享 TypeScript 配置
└── legacy/                  # 已废弃的 NestJS API 与 Docker 编排
```

仓库里曾有一套 NestJS 全栈后端（鉴权、云端设计、订单支付、管理后台），现已整包保留在 [`legacy/`](legacy/README.zh-CN.md)。默认安装、开发服务器和生产构建都不会加载它。需要时请按该文档自行恢复，没有产品模式开关。

Web 应用细节见 [`apps/web/README.zh-CN.md`](apps/web/README.zh-CN.md)。

## 本地运行

环境要求：

- Node.js >= 22
- pnpm 11.12.0（建议先运行 `corepack enable`）

```bash
pnpm install
pnpm dev
```

然后访问：

- `http://localhost:3000` — 产品首页（英文）
- `http://localhost:3000/zh` — 产品首页（简体中文）
- `http://localhost:3000/design` — 设计器
- `http://localhost:3000/zh/design` — 简体中文设计器

无需启动后端，也无需环境变量。设计器以桌面端为优先（≥ 768px）。

## 常用命令

在仓库根目录执行：

```bash
pnpm dev        # 启动开发服务器
pnpm build      # 构建生产包
pnpm start      # 启动生产构建
pnpm lint       # 代码检查
pnpm test       # 单元测试
pnpm typecheck  # 类型检查
```

## 许可证

[MIT License](LICENSE)。

字体、GLB 模型、图片和图标等第三方资源可能有独立许可，再分发前请分别核对。
