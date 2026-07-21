# JW Keyboard Designer

一款基于浏览器的**键盘键帽可视化设计与下单平台**：在线定制键帽（文字、字体、颜色、渐变、贴图、图层），一键导出 PNG / SVG，生成可用于生产的 **JIG 治具**，并支持下单、支付、企业子账号与后台管理的完整链路。

- **前台设计器**：`/design` 三栏工作区，多布局、图层系统、批量编辑、撤销/重做。
- **后端服务**：文字转曲、治具生成、鉴权、字体库、订单与支付、管理后台（含 SSE 实时通知）。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | [Next.js 16](https://nextjs.org/)（App Router + Turbopack）、[React 19](https://react.dev/)、[Tailwind CSS 4](https://tailwindcss.com/) |
| 状态 / 交互 | [Zustand 5](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo)、[@use-gesture/react](https://use-gesture.netlify.app/)、[@react-spring/web](https://www.react-spring.dev/) |
| 后端 | [NestJS 11](https://nestjs.com/)、[Prisma 7](https://www.prisma.io/) + PostgreSQL、[ioredis](https://github.com/redis/ioredis)（Redis） |
| 关键能力 | [opentype.js](https://opentype.js.org/)（转曲/治具）、腾讯云 SES（邮箱 OTP）、腾讯云 COS（对象存储）、支付宝 SDK（支付）、JWT 鉴权 |
| 工程化 | [pnpm workspaces](https://pnpm.io/workspaces) + [Turborepo](https://turbo.build/)、TypeScript、ESLint、Prettier |
| 部署 | Docker Compose（Nginx + Web + API + PostgreSQL） |

---

## Monorepo 结构

```
jw-keyboard-designer/
├── apps/
│   ├── web/                # 前端应用（Next.js）· 设计器 + 落地页
│   └── api/                # 后端服务（NestJS）· 转曲/治具/鉴权/订单/后台
├── packages/
│   ├── ui/                 # 共享 shadcn/ui 组件与全局样式（@workspace/ui）
│   ├── eslint-config/      # 共享 ESLint 配置
│   └── typescript-config/  # 共享 tsconfig
├── docker/                 # Dockerfile、nginx.conf、TLS 证书目录
├── docs/                   # 部署与功能文档
├── docker-compose.yml      # 生产编排
└── turbo.json              # Turborepo 任务管道
```

| 子项目 | 说明 | 文档 |
|--------|------|------|
| `apps/web` | 前端设计器与落地页 | [apps/web/README.md](apps/web/README.md) |
| `apps/api` | 后端 API（转曲、治具、鉴权、订单、后台） | [apps/api/README.md](apps/api/README.md) |
| `packages/ui` | 共享 UI 组件库 | — |

---

## 环境要求

- **Node.js** ≥ 22
- **pnpm** 11.12.0（仓库通过 `packageManager` 锁定，建议 `corepack enable`）
- **PostgreSQL** 与 **Redis**（本地开发 API 时需要）

---

## 快速开始

### 1. 安装依赖

在**仓库根目录**执行：

```bash
pnpm install
```

### 2. 配置后端环境变量

后端按 `NODE_ENV` 读取 `apps/api/.env.<环境>`（默认 `.env.development`）。至少需要数据库、Redis、JWT 等变量，详见 [apps/api/README.md](apps/api/README.md)。

初始化数据库（首次或 schema 变更后）：

```bash
pnpm --filter api exec prisma migrate dev
```

### 3. 启动开发环境

**一键启动所有应用**（Turbo 并行）：

```bash
pnpm dev
```

**按需单独启动**：

```bash
pnpm --filter web dev   # 仅前端
pnpm --filter api dev   # 仅后端
```

访问：

- `http://localhost:3000` — 产品首页
- `http://localhost:3000/design` — 设计编辑器
- `http://localhost:3001` — 后端 API（开发环境前端通过 Next.js rewrite 代理到此）

---

## 常用脚本（根目录）

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 并行启动所有应用（Turbo） |
| `pnpm build` | 构建所有应用 |
| `pnpm lint` | 运行 ESLint |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm format` | Prettier 格式化 |

在共享 UI 包中新增 shadcn 组件：

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

在应用中引用共享组件：

```tsx
import { Button } from "@workspace/ui/components/button";
```

---

## 部署

生产环境使用 Docker Compose 编排 **Nginx + Web + API + PostgreSQL**，由 Nginx 统一在 80 / 443 端口对外暴露并按路径分流（`/api/*` → NestJS，其余 → Next.js）。

完整步骤（环境变量、构建、迁移、HTTPS、备份、排障）见：

- [生产环境部署指南](docs/DEPLOYMENT.md)

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 生产部署（Docker Compose / Nginx / HTTPS） |
| [apps/web/README.md](apps/web/README.md) | 前端设计器功能与开发说明 |
| [apps/api/README.md](apps/api/README.md) | 后端接口、模块与环境变量 |
| [apps/api/assets/README.md](apps/api/assets/README.md) | API 运行时资产（布局/治具/字体） |
