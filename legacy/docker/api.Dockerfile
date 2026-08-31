# 已废弃：见 legacy/README.md。恢复时需把 legacy/api 加回 workspace，
# 并将下方 apps/api 路径改为 legacy/api。
# 构建上下文仍为仓库根目录：
# docker build -f legacy/docker/api.Dockerfile .

# ============================================================
# Stage 1: pruner — 执行 turbo prune，裁剪出 api 所需的最小子集
# ============================================================
FROM node:24-alpine AS pruner

ARG PNPM_VERSION=11.10.0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && npm install -g turbo@2.8.17

WORKDIR /app

COPY . .

RUN turbo prune api --docker --out-dir /pruned

# ============================================================
# Stage 2: installer — 仅用 json/ 层安装依赖（最大化 layer 缓存）
# ============================================================
FROM node:24-alpine AS installer

ARG PNPM_VERSION=11.10.0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# json/ 层：只含 package.json，不含源码，依赖层可跨构建复用
COPY --from=pruner /pruned/json/ .
COPY --from=pruner /pruned/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: builder — 复制完整源码，生成 Prisma Client，编译
# ============================================================
FROM node:24-alpine AS builder

ARG PNPM_VERSION=11.10.0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# 带 node_modules 的完整工作区
COPY --from=installer /app/ .
COPY --from=pruner /pruned/full/ .

# 生成 Prisma Client（输出到 apps/api/generated/prisma）
RUN pnpm --filter api exec prisma generate

# NestJS webpack 打包 → apps/api/dist/main.js
RUN pnpm --filter api build

# pnpm deploy：将 api 的生产依赖提取到干净目录，解决 workspace 符号链接问题
# pnpm v10+ 默认要求 inject-workspace-packages；Docker 构建用 --legacy 避免影响本地开发体验
RUN pnpm --filter api deploy --prod --legacy /out/api

# ============================================================
# Stage 4: runner — 最小运行时镜像
# ============================================================
FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /out/api/node_modules        ./node_modules
COPY --from=builder /app/apps/api/dist           ./dist
COPY --from=builder /app/apps/api/generated      ./generated
COPY --from=builder /app/apps/api/prisma         ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./prisma.config.ts

# 转曲内置字体（来自 web public；turbo prune 不含 web，故从构建上下文直接 COPY）
# 治具/布局数据（随 api 仓库 assets 维护）
COPY apps/web/public/fonts                       ./assets/fonts
COPY apps/api/assets/design-data                 ./assets/design-data

EXPOSE 3001
CMD ["node", "dist/main"]
