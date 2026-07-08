# API 运行时资产

| 路径 | 说明 |
|------|------|
| `design-data/` | 治具 SVG、键位 positions、键盘布局 JSON（随仓库提交） |
| `fonts/` | 内置转曲用 TTF（**不入仓库**；本地开发回退读 `apps/web/public/fonts`，Docker 构建时 COPY） |

Docker 镜像见 `docker/api.Dockerfile` runner 阶段。
