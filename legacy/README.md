# Retired backend (legacy)

[English](README.md) | [简体中文](README.zh-CN.md)

This directory keeps Keyboard Designer’s **NestJS API and full-stack Docker resources**. The product itself is a client-only designer. **Default install, development, and production builds do not use this code.**

You can restore it yourself if you need to, but the repo no longer ships a `standalone` / `fullstack` product-mode switch. Restore is a manual wiring job, not an environment-variable flip.

A long-idle full-stack path can drift: stale dependencies, migration gaps, expired cloud credentials, broken callbacks, privacy/compliance issues, and surprise bills. Do not put database URLs, JWT secrets, or cloud keys into public `NEXT_PUBLIC_*` variables.

## Layout

```text
legacy/
├── README.md              # this file
├── api/                   # former apps/api (NestJS 11 + Prisma 7)
├── docker/                # Dockerfiles, nginx, certificates
├── docker-compose.yml     # nginx / web / api / postgres / redis
└── .env.example           # Postgres, Redis, JWT, SES, COS, payments
```

The API does not depend on `@workspace/*` business packages. It talks to the frontend over HTTP only.

## What the backend already implements

| Area | Capability |
|------|------------|
| **Auth** | Email OTP sign-up/sign-in, set/change/reset password; JWT strategies (`login` / `setup` / `change-password`) |
| **Users** | `GET /users/me`; Role (`USER` / `ADMIN`); AccountType (`NORMAL` / `ENTERPRISE_MAIN` / `ENTERPRISE_SUB`) |
| **Designs** | CRUD, enterprise sub-account review, thumbnails on Tencent COS |
| **Fonts** | Upload TTF/OTF (≤15MB), SHA-256 dedupe, batch resolve, soft delete; COS |
| **Export** | `POST /texts-to-paths`, `POST /generate-jig` (opentype.js). The product now uses the browser path in `apps/web/lib/export/browser/` |
| **Addresses** | Shipping-address CRUD, default address |
| **Quotes & orders** | Pre-order quote, single order, enterprise batch (monthly), cancel; order state machine |
| **Payments** | Alipay / WeChat initiate + async notify, mock notify in development, refunds; `ALIPAY` / `WECHAT` / `MONTHLY` |
| **Enterprise** | Main account manages sub-accounts (disable, reset password), team design list |
| **Admin** | Order/production board, status changes, refunds, roles and account types, notifications + SSE |
| **Infra** | PostgreSQL 17 + Prisma 7 (no seed, `prisma/migrations` only), Redis 8 (OTP / token jti), Tencent SES, COS |

Module source lives in [`api/src/modules/`](api/src/modules/). HTTP details are in [`api/README.md`](api/README.md).

## Frontend leftovers (still in apps/web)

These pages and components stay in the web app so a restore does not have to realign two trees. `apps/web/next.config.mjs` currently redirects them to `/design` (and `/zh/design`):

| Location | Role |
|----------|------|
| `/login`, `/register`, and password pages | Auth |
| `/profile/*` | Account, orders, addresses, team |
| `/admin/*` | Admin console |
| `/checkout` | Checkout |
| `SaveDesignButton` / `OrderButton` | Designer toolbar “save / order” |
| `DesignListSection` | Left-sidebar cloud design list (unmounted from `SidebarLeft`) |
| `apps/web/lib/api/`, `hooks/queries/`, `userStore` | HTTP client and React Query |

The API export client `apps/web/lib/export/api.ts` is still there; the product path always uses `lib/export/browser`.

## Restore checklist

Every step below is required. Changing one variable does not bring the full stack back.

### 1. Put the API back in the workspace

Add this to the root [`pnpm-workspace.yaml`](../pnpm-workspace.yaml):

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "legacy/api"
```

If you compile Prisma / bcrypt inside Docker, add them to `allowBuilds`. Then:

```bash
pnpm install
```

### 2. Configure API env

```bash
cp legacy/.env.example .env
# plus
#   legacy/api/.env.development
# fill Postgres, Redis, JWT, SES, COS, payments from api/README.md
```

Never put secrets in `NEXT_PUBLIC_*` variables.

### 3. Migrate the database and start the API

```bash
pnpm --filter api exec prisma migrate dev
pnpm --filter api dev
```

The API listens on `3001` with no global path prefix. Production nginx strips `/api/*` before proxying.

### 4. Reconnect the frontend

In [`apps/web/next.config.mjs`](../apps/web/next.config.mjs):

- Remove redirects for `/login`, `/register`, `/profile`, `/checkout`, `/admin` (and the `/zh…` copies).
- In development, restore `/api/:path*` → `http://localhost:3001/:path*` rewrites.
- If you containerize Web, set Next.js `output: "standalone"` (that is an output layout, not a product-mode name).

In the designer, remount as needed:

- Login gate in `app/[locale]/design/layout.tsx`
- `UserInitializer` in `providers.tsx`
- `DesignListSection` in `SidebarLeft`
- Toolbar “save design / order”
- Cloud fonts (`FontFamilySelect` / `useFonts`)
- If you need server-side outlining, point `apps/web/lib/export/index.ts` back at `./api`

### 5. Docker (optional)

Current `legacy/docker*` **does not build out of the box**. At minimum:

- Workspace includes `legacy/api`
- Compose build context is the **repo root**
- Dockerfiles are `legacy/docker/api.Dockerfile` and `legacy/docker/web.Dockerfile`
- `COPY apps/api/...` becomes `COPY legacy/api/...`
- Web build injects the backend URL and auth config the stack needs

Module-level start notes: [`api/README.md`](api/README.md).
