# 部署指南

Keyboard Designer 是纯前端应用。推荐只将 `apps/web` 部署到 Vercel。仓库中的 NestJS / Docker 全栈资源已迁入 [`legacy/`](../legacy/README.md)，不参与默认部署。

## Vercel

### 前置条件

- 一个 Vercel 项目。
- Node.js >= 22。
- 仓库使用 pnpm 11.12.0，版本由根 `package.json` 的 `packageManager` 固定。

不需要配置 API、数据库、Redis、JWT、SES、COS 或支付密钥。

### 通过 Vercel 控制台部署

1. 在 Vercel 中导入此仓库。
2. Root Directory 设为 `apps/web`。
3. 打开 **Include source files outside of the Root Directory**，以便读取 workspace 中的 `packages/ui`。
4. 使用 `apps/web/vercel.json` 的 Next.js 预设；Install、Build、Output Directory 保持 Vercel 默认值。
5. 不要配置后端密钥或已废弃的 `NEXT_PUBLIC_APP_MODE`。
6. 触发部署，完成后检查 `/` 和 `/design`。

### 通过 CLI 部署

```bash
pnpm install
pnpm build
cd apps/web
vercel
vercel --prod
```

首次执行 `vercel` 时确认项目 Root Directory 为 `apps/web`，并在控制台打开工作区外源码访问。

### 部署后验收

- 首页和 `/design` 可直接打开，刷新路由不返回 404。
- 设计器无需登录即可使用。
- 浏览器 Network 面板中没有预期外的 `/api/*` 请求。
- JSON 导出后可以重新导入。
- PNG、SVG、JSON 与 JIG 治具导出可用，文字转曲不请求 API。
- 刷新页面后未导出的内存状态会消失；这是预期行为，不是服务故障。
- `/login`、`/profile`、`/admin`、`/checkout` 会跳到 `/design`。

### 环境变量

前端示例见 `apps/web/.env.example`。当前 Web **不需要任何环境变量**。

不要向任何 `NEXT_PUBLIC_*` 变量写入数据库连接串、JWT 私钥或云服务密钥。

### Vercel 常见问题

#### 找不到工作区包

确认 Vercel Root Directory 是 `apps/web`，并已打开 **Include source files outside of the Root Directory**。`apps/web` 依赖 `packages/ui` 等 workspace 包，不能只复制 Web 目录后独立安装。

#### 部署成功但设计刷新后消失

应用不提供浏览器持久化或服务端存储。请在刷新或关闭页面前手动导出 JSON。

## 其他托管平台

当前 Web 仍是 Next.js 应用，**没有**设置 `output: "export"`，因此不是纯静态站。所选平台需要支持 Next.js 运行时或兼容适配器。Vercel 是默认、风险最低的部署目标。

若自行容器化 Web，不要把旧文档里的 Next.js `output: "standalone"` 理解成产品模式名。那个选项只用于 Docker 产物布局；纯前端 Vercel 部署不需要它。

## 自行恢复全栈后端

后端代码、Docker 与恢复步骤见 [`legacy/README.md`](../legacy/README.md)。

## 相关文件

- `apps/web/vercel.json`：Vercel 部署配置。
- `apps/web/.env.example`：Web 无需环境变量的说明。
- `legacy/`：已废弃的 API、Compose、Nginx 与服务端变量示例。
