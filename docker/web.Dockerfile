# 构建上下文：项目根目录
# docker build -f docker/web.Dockerfile .

# ============================================================
# Stage 1: pruner — 执行 turbo prune，裁剪出 web 所需的最小子集
# ============================================================
FROM node:24-alpine AS pruner

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

WORKDIR /app

COPY . .

RUN pnpm dlx turbo prune web --docker --out-dir /pruned

# ============================================================
# Stage 2: installer — 仅用 json/ 层安装依赖（最大化 layer 缓存）
# ============================================================
FROM node:24-alpine AS installer

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

WORKDIR /app

# json/ 层：只含 package.json，不含源码，依赖层可跨构建复用
COPY --from=pruner /pruned/json/ .
COPY --from=pruner /pruned/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder — 复制完整源码，Next.js standalone 构建
# ============================================================
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

WORKDIR /app

# 带 node_modules 的完整工作区
COPY --from=installer /app/ .
COPY --from=pruner /pruned/full/ .

# NEXT_PUBLIC_* 变量在构建时写入客户端 bundle，必须通过 ARG/ENV 传入
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Next.js standalone 模式构建
RUN pnpm --filter web build

# ============================================================
# Stage 4: runner — 最小运行时镜像
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Next.js standalone 输出包含完整的最小化 node_modules
# 在 monorepo 中，standalone 目录内部会保留 apps/web/ 的路径结构
COPY --from=builder /app/apps/web/.next/standalone ./

# 静态资源和 public 必须手动复制到 standalone 对应路径
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public       ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# monorepo standalone 中，server.js 位于 apps/web/server.js
CMD ["node", "apps/web/server.js"]
