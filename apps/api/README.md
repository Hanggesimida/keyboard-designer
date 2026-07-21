# JW Keyboard Designer — API

**JW Keyboard Designer** 的后端服务，基于 [NestJS 11](https://nestjs.com/) + [Prisma 7](https://www.prisma.io/) + PostgreSQL 构建。负责字体转曲、治具生成、用户鉴权、字体库、订单与支付，以及带 SSE 实时通知的管理后台。

---

## 功能概览

| 领域 | 说明 |
|------|------|
| **字体转曲** | `POST /texts-to-paths`：用 opentype.js 将文字批量转为 SVG `<path>` |
| **治具生成** | `POST /generate-jig`：结合设计数据与内置治具底板生成生产用治具 SVG |
| **鉴权** | 邮箱 OTP 注册、登录、设密/改密/找回密码；JWT + Passport 多策略 |
| **字体库** | 用户上传字体，按内容寻址（SHA-256）去重存储到腾讯云 COS |
| **设计方案** | 设计 JSON 的 CRUD、提交审核、缩略图上传 |
| **订单与支付** | 报价、下单、企业批量下单、支付宝支付与回调、退款 |
| **企业子账号** | 主账号管理子账号、查看团队设计 |
| **管理后台** | 订单看板、用户角色/账号类型管理、通知（含 SSE 实时推送） |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [NestJS 11](https://nestjs.com/) |
| 数据库 | [Prisma 7](https://www.prisma.io/) + PostgreSQL |
| 缓存 / OTP | [ioredis](https://github.com/redis/ioredis)（Redis） |
| 鉴权 | [@nestjs/jwt](https://docs.nestjs.com/security/authentication) + [passport-jwt](https://www.passportjs.org/)、[bcrypt](https://github.com/kelektiv/node.bcrypt.js) |
| 字体处理 | [opentype.js](https://opentype.js.org/) |
| 邮件 | 腾讯云 SES（`tencentcloud-sdk-nodejs-ses`） |
| 对象存储 | 腾讯云 COS（`cos-nodejs-sdk-v5`） |
| 支付 | [alipay-sdk](https://github.com/alipay/alipay-sdk-nodejs-all) |
| 上传 | [multer](https://github.com/expressjs/multer)（内存存储） |

---

## 目录结构

```
apps/api/
├── src/
│   ├── main.ts                 # 入口：ValidationPipe、CORS、监听端口
│   ├── app.module.ts           # 根模块（全局 ConfigModule，按 NODE_ENV 加载 .env）
│   ├── modules/
│   │   ├── auth/               # 登录、OTP 注册、设密/改密/找回；JWT 策略与 Guard
│   │   ├── users/              # 当前用户资料（/users/me）
│   │   ├── email/              # 腾讯云 SES 发送 OTP 邮件
│   │   ├── design/             # 设计方案 CRUD、提交审核、缩略图上传 COS
│   │   ├── fonts/              # 用户字体库：上传、列表、解析、软删除
│   │   ├── export/             # 文字转曲、治具 SVG 生成（opentype.js）
│   │   ├── address/            # 收货地址 CRUD、设默认
│   │   ├── pricing/            # 下单前报价
│   │   ├── order/              # 下单、企业批量下单、订单列表/详情/取消
│   │   ├── payment/            # 发起支付、支付宝回调、退款
│   │   ├── enterprise/         # 企业主账号：子账号管理、团队设计
│   │   └── admin/              # 后台：订单、用户、通知（含 SSE）
│   ├── prisma/                 # PrismaService（PostgreSQL 连接）
│   ├── redis/                  # ioredis 全局封装
│   └── common/                 # COS 封装、Guards 等
├── prisma/
│   ├── schema.prisma           # 数据模型
│   └── migrations/             # 迁移文件
├── assets/                     # 运行时资产（布局/治具/字体，见 assets/README.md）
└── generated/prisma/           # Prisma Client 输出目录
```

---

## 快速开始

> 建议在 **monorepo 根目录**执行 `pnpm install`（工作区统一安装依赖）。

### 环境要求

- **Node.js** ≥ 22
- **pnpm** 11.12.0
- 可用的 **PostgreSQL** 与 **Redis**

### 配置环境变量

API 按 `NODE_ENV` 读取 `apps/api/.env.<环境>`（默认 `.env.development`）。在 `apps/api/` 下创建 `.env.development`：

```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# 数据库 / Redis
DATABASE_URL=postgresql://user:password@localhost:5432/jw_keyboard
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=请替换为随机字符串
JWT_EXPIRES_IN=7d
SETUP_TOKEN_SECRET=请替换为随机字符串（与 JWT_SECRET 不同）
# CHANGE_PASSWORD_TOKEN_SECRET=可选，缺省回退 SETUP_TOKEN_SECRET

# 腾讯云 SES（邮箱 OTP，缺失时 API 无法启动）
TENCENT_SECRET_ID=你的 SecretId
TENCENT_SECRET_KEY=你的 SecretKey
TENCENT_SES_REGION=ap-guangzhou
TENCENT_SES_FROM=no-reply@你的域名.com
TENCENT_SES_TEMPLATE_ID=你的模板 ID

# 腾讯云 COS（缩略图 / 字体存储）
TENCENT_COS_BUCKET=你的桶名-appid
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_DOMAIN=https://你的-cos-访问域名

# 支付宝（可选，缺失则不启用支付）
# ALIPAY_APP_ID=
# ALIPAY_APP_PRIVATE_KEY=
# ALIPAY_OFFICIAL_PUBLIC_KEY=
# ALIPAY_GATEWAY=
# ALIPAY_NOTIFY_URL=
# ALIPAY_RETURN_URL=
```

### 初始化数据库

```bash
# 从根目录
pnpm --filter api exec prisma migrate dev

# 或在 apps/api 目录下
pnpm exec prisma migrate dev
```

### 启动开发服务器

```bash
# 从根目录（仅 API）
pnpm --filter api dev

# 或在 apps/api 目录下
pnpm dev
```

默认监听 `http://localhost:3001`（可用 `PORT` 覆盖）。

### 构建与生产运行

```bash
pnpm --filter api build
pnpm --filter api exec node dist/main   # 或 apps/api 下 pnpm start:prod
```

---

## 环境变量参考

| 变量 | 必填 | 说明 |
|------|------|------|
| `NODE_ENV` | 否 | 环境标识，决定加载哪个 `.env` 文件、CORS 与 mock 行为 |
| `PORT` | 否 | 监听端口，默认 `3001` |
| `CORS_ORIGIN` | 否 | 开发环境允许的前端 origin，默认 `http://localhost:3000` |
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `REDIS_URL` | 是 | Redis 连接串（OTP、token jti 校验） |
| `JWT_SECRET` | 是 | 登录 JWT 签名密钥 |
| `JWT_EXPIRES_IN` | 否 | Token 有效期，默认 `7d` |
| `SETUP_TOKEN_SECRET` | 是 | 注册后设置密码流程的独立签名密钥 |
| `CHANGE_PASSWORD_TOKEN_SECRET` | 否 | 强制改密 token 密钥，缺省回退 `SETUP_TOKEN_SECRET` |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | 是 | 腾讯云 API 密钥（SES + COS 共用） |
| `TENCENT_SES_REGION` / `TENCENT_SES_FROM` / `TENCENT_SES_TEMPLATE_ID` | 是 | SES 发信配置 |
| `TENCENT_COS_BUCKET` / `TENCENT_COS_REGION` / `TENCENT_COS_DOMAIN` | 是 | COS 桶与公网访问域名 |
| `ALIPAY_APP_ID` / `ALIPAY_APP_PRIVATE_KEY` / `ALIPAY_OFFICIAL_PUBLIC_KEY` | 否 | 支付宝支付，缺失则不启用 |
| `ALIPAY_GATEWAY` / `ALIPAY_NOTIFY_URL` / `ALIPAY_RETURN_URL` | 否 | 支付宝网关与回调地址 |

> 生产环境下 `DATABASE_URL` / `REDIS_URL` 由 Docker Compose 依据 `POSTGRES_*`、`REDIS_PASSWORD` 自动拼接，详见 [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)。

---

## 全局约定

- **无全局路由前缀**：控制器路由即根路径（生产由 Nginx 去掉 `/api` 前缀后转发）。
- **ValidationPipe**：全局开启 `whitelist` + `forbidNonWhitelisted` + `transform`。
- **CORS**：生产环境同域反代（`origin: false`）；开发环境放行 `CORS_ORIGIN`。

---

## 主要接口

> 除标注「无鉴权」外，均需 `Authorization: Bearer <JWT>`。

### 鉴权 `auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/login` | 邮箱密码登录（无鉴权） |
| POST | `/auth/send-otp` | 发送邮箱验证码（无鉴权） |
| POST | `/auth/verify-otp` | 校验 OTP，返回 setup token（无鉴权） |
| POST | `/auth/set-password` | 注册后设置密码（setup token） |
| POST | `/auth/change-initial-password` | 强制改密（change-password token） |
| POST | `/auth/change-password` | 已登录改密 |
| POST | `/auth/forgot-password` | 忘记密码发 OTP（无鉴权） |
| POST | `/auth/reset-password` | OTP 重置密码（无鉴权） |

### 导出 export

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/texts-to-paths` | 批量文字转 SVG path |
| POST | `/generate-jig` | 生成治具 SVG 附件下载 |

### 字体库 fonts

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/fonts` | 当前用户字体列表 |
| POST | `/fonts/resolve` | 按 ID 批量解析字体元数据/URL |
| POST | `/fonts` | 上传字体文件（multipart，≤ 15MB） |
| DELETE | `/fonts/:id` | 软删除字体条目 |

### 设计 / 地址 / 订单 / 支付

| 方法 | 路径 | 说明 |
|------|------|------|
| POST · GET | `/designs` · `/designs/:id` | 设计方案 CRUD |
| PATCH | `/designs/:id/submit` | 子账号提交审核 |
| POST | `/designs/:id/thumbnail` | 上传缩略图到 COS |
| GET · POST | `/addresses` … `/addresses/:id/default` | 收货地址 CRUD、设默认 |
| GET | `/pricing/quote?designId=&quantity=` | 下单前报价 |
| POST | `/orders` · `/orders/batch` | 下单 / 企业批量下单 |
| POST | `/orders/:id/cancel` | 取消订单 |
| POST | `/payments/initiate` | 发起支付 |
| POST | `/payments/alipay/notify` | 支付宝异步通知（无鉴权） |

### 后台 admin（需 ADMIN 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| SSE | `/admin/notifications/stream` | 实时通知推送（可经 query `token` 传 JWT） |
| GET | `/admin/notifications` · `/admin/notifications/unread-count` | 通知列表 / 未读数 |
| PATCH | `/admin/notifications/read-all` · `/admin/notifications/:id/read` | 全部/单条已读 |
| GET | `/admin/orders` · `/admin/orders/production-board` · `/admin/orders/:id` | 订单列表 / 生产看板 / 详情 |
| PATCH · POST | `/admin/orders/:id/status` · `/admin/orders/:id/refund` | 改状态 / 退款 |
| GET · PATCH | `/admin/users` … `/admin/users/:id/role` · `/admin/users/:id/account-type` | 用户列表 / 改角色 / 改账号类型 |

---

## 数据模型（Prisma）

`prisma/schema.prisma` 主要模型：

| 模型 | 说明 |
|------|------|
| `User` | 用户；含 `Role`、`AccountType`，企业主/子账号自关联 |
| `FontBlob` | 字体二进制内容寻址（SHA-256），存 COS key/url |
| `UserFont` | 用户字体库条目，关联 `FontBlob` |
| `Design` | 设计方案 JSON + 状态 + 缩略图 |
| `Address` | 收货地址 |
| `Order` | 订单（含设计/地址快照） |
| `Payment` | 支付记录（与 `Order` 1:1） |
| `Refund` | 退款审计与幂等号 |
| `Notification` | 管理员通知 |

枚举：`Role`、`AccountType`、`DesignStatus`、`OrderStatus`、`PaymentMethod`、`PaymentStatus`、`RefundStatus`、`NotificationType`。

常用 Prisma 命令：

```bash
pnpm --filter api exec prisma migrate dev      # 开发：生成并应用迁移
pnpm --filter api exec prisma migrate deploy   # 生产：应用已有迁移
pnpm --filter api exec prisma migrate status   # 查看迁移状态
pnpm --filter api exec prisma studio           # 可视化数据浏览
```

---

## 脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 开发模式（watch） |
| `pnpm build` | 编译到 `dist/` |
| `pnpm start:prod` | 运行编译产物 |
| `pnpm lint` | ESLint（`--fix`） |
| `pnpm test` / `pnpm test:e2e` | 单元 / e2e 测试 |

---

## 运行时资产

`assets/` 存放键盘布局 JSON、治具底板与坐标、内置转曲字体。查找与回退逻辑见 [assets/README.md](assets/README.md)。

---

## 部署

生产环境通过 `docker/api.Dockerfile` 多阶段构建并由 Docker Compose 编排，迁移需手动执行。完整说明见 [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)。
