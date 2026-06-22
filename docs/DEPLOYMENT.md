# 生产环境部署指南

本文档说明如何使用 Docker Compose 将 **JW Keyboard Designer** 部署到生产服务器。

## 架构概览

生产环境由四个容器组成，通过 Nginx 统一对外暴露 **80 端口**：

```mermaid
flowchart LR
    Client[浏览器] --> Nginx[Nginx :80]
    Nginx -->|"/ 页面"| Web[Next.js :3000]
    Nginx -->|"/api/* 大部分"| API[NestJS :3001]
    Nginx -->|"/api/generate-jig 等"| Web
    API --> PG[(PostgreSQL :5432)]
```

| 服务 | 镜像 / 构建 | 内部端口 | 说明 |
|------|-------------|----------|------|
| `nginx` | `nginx:alpine` | 80 | 反向代理，按路径分流 |
| `web` | `docker/web.Dockerfile` | 3000 | Next.js（standalone 模式） |
| `api` | `docker/api.Dockerfile` | 3001 | NestJS + Prisma |
| `postgres` | `postgres:17` | 5432 | PostgreSQL 数据库 |

### 路由规则

Nginx 配置见 [`docker/nginx.conf`](../docker/nginx.conf)：

- `/api/generate-jig`、`/api/texts-to-paths` → Next.js（设计器本地 API Route）
- `/api/admin/notifications/stream` → NestJS SSE 长连接（关闭缓冲，超时 3600s）
- 其余 `/api/*` → NestJS（去掉 `/api` 前缀后转发）
- 其余路径 → Next.js 前端

生产环境下前端通过相对路径 `/api` 访问后端，无需配置跨域；开发环境才使用 Next.js rewrite 直连 `localhost:3001`。

---

## 环境要求

### 服务器

- **操作系统**：Linux（推荐 Ubuntu 22.04+）或任意支持 Docker 的系统
- **CPU / 内存**：建议 2 核、4 GB RAM 及以上
- **磁盘**：建议 20 GB 以上（含镜像、数据库、日志）
- **网络**：开放 **80** 端口（若自行配置 HTTPS，还需 **443**）

### 软件

- [Docker Engine](https://docs.docker.com/engine/install/) 24+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+
- Git（用于拉取代码）

构建镜像时使用 **Node 24** 与 **pnpm 11.5.0**（已封装在 Dockerfile 中，宿主机无需安装 Node）。

---

## 部署前准备

### 1. 域名

1. 将域名 A 记录指向服务器公网 IP。
2. 修改 [`docker/nginx.conf`](../docker/nginx.conf) 中的 `server_name`（默认为 `jw-key.com`）为你的实际域名。
3. 如需 HTTPS，见下文 [配置 HTTPS](#配置-https)。

### 2. Cloudflare Turnstile

注册/登录需要人机验证，需提前在 [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) 创建站点：

- **Site Key** → 构建时写入前端（`NEXT_PUBLIC_TURNSTILE_SITE_KEY`）
- **Secret Key** → 运行时注入 API（`TURNSTILE_SECRET_KEY`）

> **注意**：`NEXT_PUBLIC_*` 变量在 **构建 web 镜像时** 打入客户端 bundle，修改后必须 **重新构建 `web` 镜像**，仅重启容器无效。

### 3. JWT 密钥

生成足够强度的随机字符串，例如：

```bash
openssl rand -base64 48
```

写入 `.env` 中的 `JWT_SECRET`。

---

## 环境变量

在项目根目录创建 `.env` 文件（**不要提交到 Git**）。Docker Compose 会自动读取该文件。

```env
# ── PostgreSQL ──────────────────────────────────
POSTGRES_USER=jw
POSTGRES_PASSWORD=请替换为强密码
POSTGRES_DB=jw_keyboard

# ── API ─────────────────────────────────────────
JWT_SECRET=请替换为 openssl rand -base64 48 的输出
JWT_EXPIRES_IN=7d
TURNSTILE_SECRET_KEY=你的 Turnstile Secret Key

# ── Web 构建参数（docker compose build 时使用）──
NEXT_PUBLIC_TURNSTILE_SITE_KEY=你的 Turnstile Site Key
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `POSTGRES_USER` | 是 | 数据库用户名 |
| `POSTGRES_PASSWORD` | 是 | 数据库密码 |
| `POSTGRES_DB` | 是 | 数据库名 |
| `JWT_SECRET` | 是 | JWT 签名密钥，缺失时 API 无法启动 |
| `JWT_EXPIRES_IN` | 否 | Token 有效期，默认 `7d` |
| `TURNSTILE_SECRET_KEY` | 是 | Turnstile 服务端校验密钥 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 是 | Turnstile 前端 Site Key（构建 web 时使用） |

容器内 API 的 `DATABASE_URL` 由 Compose 自动拼接，无需手动配置：

```
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

---

## 部署步骤

### 1. 获取代码

```bash
git clone <仓库地址> jw-keyboard-designer
cd jw-keyboard-designer
```

### 2. 配置环境变量

```bash
cp .env.example .env   # 若仓库提供了示例文件
# 编辑 .env，填入上述变量
```

若仓库暂无 `.env.example`，直接按上一节手动创建 `.env`。

### 3. 修改 Nginx 域名（如需要）

编辑 `docker/nginx.conf`，将 `server_name` 改为你的域名。

### 4. 构建并启动

```bash
docker compose build
docker compose up -d
```

查看服务状态：

```bash
docker compose ps
docker compose logs -f
```

正常启动后，四个服务均为 `running`，`postgres` 健康检查通过后再启动 `api`。

### 5. 执行数据库迁移

**API 镜像不会自动运行迁移**，首次部署及每次 schema 变更后需手动执行：

```bash
docker compose exec api npx prisma migrate deploy
```

确认迁移成功：

```bash
docker compose exec api npx prisma migrate status
```

### 6. 创建管理员账号

系统注册默认为普通用户（`USER` 角色）。首次部署后：

1. 在网站完成注册；
2. 将对应用户提升为管理员：

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE \"User\" SET role = 'ADMIN' WHERE email = 'your-admin@example.com';"
```

> 将 `your-admin@example.com` 替换为实际注册邮箱；`POSTGRES_USER` / `POSTGRES_DB` 需与 `.env` 一致，或在命令中写死具体值。

### 7. 验证

- 浏览器访问 `http://<你的域名>/`，确认前端页面正常加载。
- 尝试注册 / 登录，确认 Turnstile 与 API 正常。
- 管理员账号登录后访问后台，确认通知 SSE 等管理功能可用。

---

## 更新部署

代码或依赖变更后：

```bash
git pull
docker compose build          # 若仅改 API，可：docker compose build api
docker compose up -d
docker compose exec api npx prisma migrate deploy   # 若有新迁移
```

仅修改 `.env` 中的运行时变量（如 `JWT_SECRET`）：

```bash
docker compose up -d
```

修改 `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 后必须重新构建 web：

```bash
docker compose build web
docker compose up -d web
```

---

## 单独构建镜像

不通过 Compose、仅构建镜像时，需在 **项目根目录** 执行：

```bash
# API
docker build -f docker/api.Dockerfile -t jw-api:latest .

# Web（必须传入构建参数）
docker build -f docker/web.Dockerfile \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=你的SiteKey \
  -t jw-web:latest .
```

---

## 配置 HTTPS

当前 Compose 配置仅监听 **HTTP 80**。生产环境建议启用 TLS，常见方案：

### 方案 A：云负载均衡 / CDN 终结 TLS（推荐）

在阿里云 SLB、AWS ALB、Cloudflare 等入口配置 HTTPS 证书，后端仍指向服务器 80 端口。需在代理层设置：

- `X-Forwarded-For`
- `X-Forwarded-Proto: https`（若应用后续需要识别 HTTPS）

### 方案 B：宿主机 Nginx / Caddy + Certbot

在 Docker 外层再套一层反向代理，由宿主机 Nginx/Caddy 申请 Let's Encrypt 证书并转发到 `127.0.0.1:80`。

### 方案 C：扩展容器内 Nginx

挂载证书目录、增加 443 `listen` 块，或使用 `nginx-proxy` + `acme-companion` 等方案。需自行修改 `docker-compose.yml` 与 `nginx.conf`，不在默认配置范围内。

---

## 数据备份与恢复

数据库持久化在 Docker Volume `pg_data` 中。

**备份：**

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  > backup_$(date +%Y%m%d_%H%M%S).sql
```

**恢复：**

```bash
cat backup.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

建议配置定时备份（cron + 上述命令），并将备份文件异地存储。

---

## 生产安全建议

1. **不要** 将 `.env` 提交到版本库。
2. **不要** 在公网长期暴露 PostgreSQL 的 `5432` 端口。若仅本机或容器间访问，可在 `docker-compose.yml` 中删除 `postgres.ports` 映射。
3. 使用强密码与足够长的 `JWT_SECRET`。
4. 定期更新基础镜像（`postgres:17`、`nginx:alpine`、Node 镜像）并重新构建应用镜像。
5. 配置防火墙，仅开放必要端口（80/443、SSH）。

---

## 常见问题

### 构建 web 失败或 Turnstile 不显示

检查 `.env` 中是否设置了 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`，且执行了 `docker compose build web`（不是仅 `up`）。

### API 启动报 JWT_SECRET 相关错误

确认 `.env` 中 `JWT_SECRET` 已设置，并执行 `docker compose up -d api` 重新创建容器。

### 数据库连接失败

1. 确认 `postgres` 容器健康：`docker compose ps`
2. 确认 `.env` 中数据库账号密码与 `DATABASE_URL` 拼接一致
3. 查看 API 日志：`docker compose logs api`

### 迁移报错「database does not exist」

首次启动需等待 PostgreSQL 初始化完成后再执行 `prisma migrate deploy`。

### SSE 通知连接失败

确认 Nginx 中 `/api/admin/notifications/stream` 路由未被其他规则覆盖；该路径需要长连接，不可经过会缓冲响应的中间层。

### 开发环境 vs 生产环境差异

| 项目 | 开发 | 生产 |
|------|------|------|
| API 访问 | Next.js rewrite → `localhost:3001` | 浏览器 → Nginx → `/api` → API |
| CORS | 允许 `localhost:3000` | 关闭（同域反代） |
| SSE | 直连 `NEXT_PUBLIC_API_URL` | 相对路径 `/api/admin/notifications/stream` |
| 环境文件 | `apps/api/.env.development` | Compose 注入环境变量 |

---

## 相关文件

| 文件 | 说明 |
|------|------|
| [`docker-compose.yml`](../docker-compose.yml) | 服务编排与网络 |
| [`docker/api.Dockerfile`](../docker/api.Dockerfile) | API 多阶段构建 |
| [`docker/web.Dockerfile`](../docker/web.Dockerfile) | Web 多阶段构建（Turbo prune + standalone） |
| [`docker/nginx.conf`](../docker/nginx.conf) | 反向代理路由 |
| [`apps/api/prisma/migrations/`](../apps/api/prisma/migrations/) | 数据库迁移文件 |
