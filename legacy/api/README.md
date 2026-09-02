# Keyboard Designer — API

[English](README.md) | [简体中文](README.zh-CN.md)

> **Retired.** This service lives in `legacy/api` and is not part of the default build. To enable it yourself, see the parent [legacy/README.md](../README.md).

Backend for **Keyboard Designer**, built with [NestJS 11](https://nestjs.com/) + [Prisma 7](https://www.prisma.io/) + PostgreSQL. It handled text outlining, jig generation, auth, a font library, orders and payments, and an admin console with SSE notifications.

The current product does those exports in the browser. This API is kept for restore only.

---

## Capabilities

| Area | Notes |
|------|--------|
| **Text outlining** | `POST /texts-to-paths`: batch convert legends to SVG `<path>` with opentype.js |
| **Jig generation** | `POST /generate-jig`: design data + built-in jig plate → production jig SVG |
| **Auth** | Email OTP sign-up, sign-in, set/change/reset password; JWT + Passport strategies |
| **Font library** | User-uploaded fonts, content-addressed (SHA-256) on Tencent COS |
| **Designs** | Design JSON CRUD, submit for review, thumbnail upload |
| **Orders & payments** | Quotes, place order, enterprise batch, Alipay notify, refunds |
| **Enterprise** | Main account manages sub-accounts and team designs |
| **Admin** | Order board, user role/account-type, notifications (including SSE) |

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [NestJS 11](https://nestjs.com/) |
| Database | [Prisma 7](https://www.prisma.io/) + PostgreSQL |
| Cache / OTP | [ioredis](https://github.com/redis/ioredis) (Redis) |
| Auth | [@nestjs/jwt](https://docs.nestjs.com/security/authentication) + [passport-jwt](https://www.passportjs.org/), [bcrypt](https://github.com/kelektiv/node.bcrypt.js) |
| Fonts | [opentype.js](https://opentype.js.org/) |
| Email | Tencent SES (`tencentcloud-sdk-nodejs-ses`) |
| Object storage | Tencent COS (`cos-nodejs-sdk-v5`) |
| Payments | [alipay-sdk](https://github.com/alipay/alipay-sdk-nodejs-all) |
| Uploads | [multer](https://github.com/expressjs/multer) (memory storage) |

---

## Directory layout

```
legacy/api/
├── src/
│   ├── main.ts                 # ValidationPipe, CORS, listen port
│   ├── app.module.ts           # Root module (global ConfigModule, .env by NODE_ENV)
│   ├── modules/
│   │   ├── auth/               # Login, OTP sign-up, set/change/reset password; JWT
│   │   ├── users/              # Current user (/users/me)
│   │   ├── email/              # Tencent SES OTP mail
│   │   ├── design/             # Design CRUD, review, COS thumbnails
│   │   ├── fonts/              # User fonts: upload, list, resolve, soft delete
│   │   ├── export/             # Text outlining, jig SVG (opentype.js)
│   │   ├── address/            # Shipping addresses
│   │   ├── pricing/            # Pre-order quote
│   │   ├── order/              # Place order, batch, list/detail/cancel
│   │   ├── payment/            # Initiate, Alipay notify, refund
│   │   ├── enterprise/         # Sub-accounts, team designs
│   │   └── admin/              # Orders, users, notifications (SSE)
│   ├── prisma/                 # PrismaService
│   ├── redis/                  # ioredis wrapper
│   └── common/                 # COS helper, guards
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── assets/                     # Runtime assets (see assets/README.md)
└── generated/prisma/           # Prisma Client output
```

---

## Getting started

> Install from the **monorepo root** with `pnpm install` after adding `legacy/api` to the workspace. See [legacy/README.md](../README.md).

### Requirements

- **Node.js** ≥ 22
- **pnpm** 11.12.0
- Running **PostgreSQL** and **Redis**

### Environment

The API loads `legacy/api/.env.<NODE_ENV>` (default `.env.development`). Create `legacy/api/.env.development`:

```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Database / Redis
DATABASE_URL=postgresql://user:password@localhost:5432/keyboard
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=replace-with-a-random-string
JWT_EXPIRES_IN=7d
SETUP_TOKEN_SECRET=replace-with-a-different-random-string
# CHANGE_PASSWORD_TOKEN_SECRET=optional; falls back to SETUP_TOKEN_SECRET

# Tencent SES (required to boot — used for email OTP)
TENCENT_SECRET_ID=your-SecretId
TENCENT_SECRET_KEY=your-SecretKey
TENCENT_SES_REGION=ap-guangzhou
TENCENT_SES_FROM=no-reply@your-domain.com
TENCENT_SES_TEMPLATE_ID=your-template-id

# Tencent COS (thumbnails / fonts)
TENCENT_COS_BUCKET=your-bucket-appid
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_DOMAIN=https://your-cos-public-host

# Alipay (optional; omit to disable payments)
# ALIPAY_APP_ID=
# ALIPAY_APP_PRIVATE_KEY=
# ALIPAY_OFFICIAL_PUBLIC_KEY=
# ALIPAY_GATEWAY=
# ALIPAY_NOTIFY_URL=
# ALIPAY_RETURN_URL=
```

### Database

```bash
# from repo root (after workspace includes legacy/api)
pnpm --filter api exec prisma migrate dev
```

### Dev server

```bash
pnpm --filter api dev
```

Listens on `http://localhost:3001` (`PORT` overrides).

### Production build

```bash
pnpm --filter api build
pnpm --filter api exec node dist/main
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | no | Selects `.env` file, CORS, and mock behavior |
| `PORT` | no | Listen port, default `3001` |
| `CORS_ORIGIN` | no | Allowed frontend origin in development, default `http://localhost:3000` |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis (OTP, token jti) |
| `JWT_SECRET` | yes | Login JWT signing key |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `7d` |
| `SETUP_TOKEN_SECRET` | yes | Separate signing key for post-sign-up password setup |
| `CHANGE_PASSWORD_TOKEN_SECRET` | no | Forced password-change token; falls back to `SETUP_TOKEN_SECRET` |
| `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY` | yes | Tencent API keys (SES + COS) |
| `TENCENT_SES_REGION` / `TENCENT_SES_FROM` / `TENCENT_SES_TEMPLATE_ID` | yes | SES sender config |
| `TENCENT_COS_BUCKET` / `TENCENT_COS_REGION` / `TENCENT_COS_DOMAIN` | yes | COS bucket and public host |
| `ALIPAY_APP_ID` / `ALIPAY_APP_PRIVATE_KEY` / `ALIPAY_OFFICIAL_PUBLIC_KEY` | no | Alipay; omit to disable |
| `ALIPAY_GATEWAY` / `ALIPAY_NOTIFY_URL` / `ALIPAY_RETURN_URL` | no | Alipay gateway and callbacks |

In Docker Compose, `DATABASE_URL` / `REDIS_URL` are assembled from `POSTGRES_*` and `REDIS_PASSWORD`. See [legacy/README.md](../README.md).

---

## Conventions

- **No global route prefix**: controller paths are rooted (production nginx strips `/api` then proxies).
- **ValidationPipe**: global `whitelist` + `forbidNonWhitelisted` + `transform`.
- **CORS**: same-origin reverse proxy in production (`origin: false`); `CORS_ORIGIN` in development.

---

## Main endpoints

> Bearer JWT required unless marked **unauthenticated**.

### Auth `auth`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/login` | Email + password (unauthenticated) |
| POST | `/auth/send-otp` | Send email code (unauthenticated) |
| POST | `/auth/verify-otp` | Verify OTP, return setup token (unauthenticated) |
| POST | `/auth/set-password` | Set password after sign-up (setup token) |
| POST | `/auth/change-initial-password` | Forced password change (change-password token) |
| POST | `/auth/change-password` | Change password while signed in |
| POST | `/auth/forgot-password` | Forgot-password OTP (unauthenticated) |
| POST | `/auth/reset-password` | Reset with OTP (unauthenticated) |

### Export `export`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/texts-to-paths` | Batch legends → SVG path |
| POST | `/generate-jig` | Download jig SVG |

### Fonts `fonts`

| Method | Path | Notes |
|--------|------|--------|
| GET | `/fonts` | Current user’s fonts |
| POST | `/fonts/resolve` | Batch resolve metadata/URL by id |
| POST | `/fonts` | Upload (multipart, ≤ 15MB) |
| DELETE | `/fonts/:id` | Soft delete |

### Designs / addresses / orders / payments

| Method | Path | Notes |
|--------|------|--------|
| POST · GET | `/designs` · `/designs/:id` | Design CRUD |
| PATCH | `/designs/:id/submit` | Sub-account submit for review |
| POST | `/designs/:id/thumbnail` | Upload thumbnail to COS |
| GET · POST | `/addresses` … `/addresses/:id/default` | Addresses |
| GET | `/pricing/quote?designId=&quantity=` | Quote |
| POST | `/orders` · `/orders/batch` | Place / batch order |
| POST | `/orders/:id/cancel` | Cancel |
| POST | `/payments/initiate` | Start payment |
| POST | `/payments/alipay/notify` | Alipay async notify (unauthenticated) |

### Admin `admin` (ADMIN role)

| Method | Path | Notes |
|--------|------|--------|
| SSE | `/admin/notifications/stream` | Live notifications (`token` query JWT allowed) |
| GET | `/admin/notifications` · `/admin/notifications/unread-count` | List / unread count |
| PATCH | `/admin/notifications/read-all` · `/admin/notifications/:id/read` | Mark read |
| GET | `/admin/orders` · `/admin/orders/production-board` · `/admin/orders/:id` | Orders / board / detail |
| PATCH · POST | `/admin/orders/:id/status` · `/admin/orders/:id/refund` | Status / refund |
| GET · PATCH | `/admin/users` … `/admin/users/:id/role` · `/admin/users/:id/account-type` | Users / role / account type |

---

## Data model (Prisma)

Main models in `prisma/schema.prisma`:

| Model | Notes |
|-------|--------|
| `User` | User; `Role`, `AccountType`; enterprise parent/child |
| `FontBlob` | Content-addressed font bytes (SHA-256), COS key/url |
| `UserFont` | Per-user font entry → `FontBlob` |
| `Design` | Design JSON + status + thumbnail |
| `Address` | Shipping address |
| `Order` | Order (design/address snapshots) |
| `Payment` | Payment (1:1 with `Order`) |
| `Refund` | Refund audit + idempotency key |
| `Notification` | Admin notification |

Enums: `Role`, `AccountType`, `DesignStatus`, `OrderStatus`, `PaymentMethod`, `PaymentStatus`, `RefundStatus`, `NotificationType`.

```bash
pnpm --filter api exec prisma migrate dev      # generate + apply (dev)
pnpm --filter api exec prisma migrate deploy   # apply existing (prod)
pnpm --filter api exec prisma migrate status
pnpm --filter api exec prisma studio
```

---

## Scripts

| Command | Notes |
|---------|--------|
| `pnpm dev` | Watch mode |
| `pnpm build` | Compile to `dist/` |
| `pnpm start:prod` | Run the compiled app |
| `pnpm lint` | ESLint (`--fix`) |
| `pnpm test` / `pnpm test:e2e` | Unit / e2e |

---

## Runtime assets

`assets/` holds layout JSON, jig plates and coordinates, and built-in outline fonts. Lookup and fallback: [assets/README.md](assets/README.md).

---

## Deploy

Production used `docker/api.Dockerfile` (multi-stage) and Docker Compose. Migrations are manual. Restore steps: [legacy/README.md](../README.md).
