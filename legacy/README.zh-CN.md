# 已废弃的后端（legacy）

[English](README.md) | [简体中文](README.zh-CN.md)

本目录保存 Keyboard Designer 的 **NestJS 后端与全栈 Docker 部署资源**。产品本身已是纯前端设计器。**默认安装、开发和生产构建都不会使用这里的代码。**

有需要时可以自行恢复，但仓库不再提供 `standalone` / `fullstack` 双模式开关。恢复是一次手动接线，不是改环境变量。

长期未运行的全栈路径可能存在依赖老化、迁移缺口、云服务配置漂移、密钥过期、回调失败、数据与隐私合规以及意外费用等风险。不要把数据库连接串、JWT 私钥或云服务密钥放进前端公开环境变量。

## 目录

```text
legacy/
├── README.md              # 本文件
├── api/                   # 原 apps/api（NestJS 11 + Prisma 7）
├── docker/                # Dockerfile、nginx、证书
├── docker-compose.yml     # 全栈编排（nginx / web / api / postgres / redis）
└── .env.example           # Postgres、Redis、JWT、SES、COS、支付
```

API 不依赖 `@workspace/*` 业务包，与前端只通过 HTTP 契约交互。

## 已有后端功能

| 领域 | 能力 |
|------|------|
| **鉴权** | 邮箱 OTP 注册/登录、设密/改密/找回；JWT 三策略（login / setup / change-password） |
| **用户** | `GET /users/me`；Role（`USER` / `ADMIN`）；AccountType（`NORMAL` / `ENTERPRISE_MAIN` / `ENTERPRISE_SUB`） |
| **设计方案** | CRUD、企业子账号提交审核、缩略图上传腾讯云 COS |
| **字体库** | 上传 TTF/OTF（≤15MB）、SHA-256 去重、批量 resolve、软删除；COS |
| **导出** | `POST /texts-to-paths`、`POST /generate-jig`（opentype.js）。当前产品已改用浏览器实现，见 `apps/web/lib/export/browser/` |
| **地址** | 收货地址 CRUD、设默认 |
| **报价与订单** | 下单前报价、单笔下单、企业批量下单（月结）、取消；订单状态机 |
| **支付** | 支付宝 / 微信发起与异步回调、开发 mock 回调、退款；`ALIPAY` / `WECHAT` / `MONTHLY` |
| **企业** | 主账号管理子账号（禁用、重置密码）、团队设计列表 |
| **管理后台** | 订单/生产看板、改状态、退款、用户角色与账号类型、通知列表 + SSE |
| **基础设施** | PostgreSQL 17 + Prisma 7（无 seed，仅 `prisma/migrations`）、Redis 8（OTP / 令牌 jti）、腾讯云 SES、COS |

模块源码在 [`api/src/modules/`](api/src/modules/)，接口细节见 [`api/README.zh-CN.md`](api/README.zh-CN.md)。

## 配套前端入口（仍在 apps/web）

这些页面和组件仍留在前端仓库，避免恢复时对不齐两套源码。当前 `apps/web/next.config.mjs` 把它们 redirect 到 `/design`（以及 `/zh/design`）：

| 位置 | 作用 |
|------|------|
| `/login`、`/register` 及密码相关页 | 鉴权 |
| `/profile/*` | 个人中心、订单、地址、团队 |
| `/admin/*` | 管理后台 |
| `/checkout` | 下单结账 |
| `SaveDesignButton` / `OrderButton` | 设计器工具栏「保存设计 / 下单」 |
| `DesignListSection` | 左侧「我的设计」云端列表（已从 `SidebarLeft` 卸载） |
| `apps/web/lib/api/`、`hooks/queries/`、`userStore` | HTTP 客户端与 React Query |

浏览器导出客户端 `apps/web/lib/export/api.ts` 仍在，但产品路径固定走 `lib/export/browser`。

## 自行恢复清单

以下步骤必须全部完成，缺一不可。不要只改一个变量就当全栈可用。

### 1. 把 API 加回 workspace

在根目录 [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) 增加：

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "legacy/api"
```

如需在 Docker 中编译 Prisma / bcrypt，把它们加回 `allowBuilds`。然后：

```bash
pnpm install
```

### 2. 配置 API 环境

```bash
cp legacy/.env.example .env
# 以及
#   legacy/api/.env.development
# 按 api/README.md 填写 Postgres、Redis、JWT、SES、COS、支付
```

密钥不要写进任何 `NEXT_PUBLIC_*` 变量。

### 3. 迁移数据库并启动 API

```bash
pnpm --filter api exec prisma migrate dev
pnpm --filter api dev
```

API 默认监听 `3001`，无全局路径前缀。生产 Nginx 把 `/api/*` 去掉前缀再转发。

### 4. 重新接通前端

在 [`apps/web/next.config.mjs`](../apps/web/next.config.mjs)：

- 删除对 `/login`、`/register`、`/profile`、`/checkout`、`/admin` 的 redirect（以及 `/zh…` 对应项）。
- 开发环境加回 `/api/:path*` → `http://localhost:3001/:path*` 的 rewrite。
- 若用 Docker 跑 Web，设置 Next.js `output: "standalone"`（这是容器产物格式，与旧产品模式名无关）。

在设计器里按需挂回：

- `app/[locale]/design/layout.tsx` 的登录门禁
- `providers.tsx` 的 `UserInitializer`
- `SidebarLeft` 中的 `DesignListSection`
- 工具栏「保存设计 / 下单」
- 云端字体（`FontFamilySelect` / `useFonts`）
- 需要服务端转曲时，把 `apps/web/lib/export/index.ts` 改回调用 `./api`

### 5. Docker（可选）

当前 `legacy/docker*` **不能开箱构建**。恢复时至少要：

- 工作区包含 `legacy/api`
- compose 的 build context 指向**仓库根目录**
- `dockerfile` 改为 `legacy/docker/api.Dockerfile`、`legacy/docker/web.Dockerfile`
- Dockerfile 里 `COPY apps/api/...` 改为 `COPY legacy/api/...`
- Web 构建注入全栈所需的后端地址与鉴权配置

更细的模块启动说明见 [`api/README.zh-CN.md`](api/README.zh-CN.md)。
