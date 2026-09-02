# Runtime assets

[English](README.md) | [简体中文](README.zh-CN.md)

| Path | Notes |
|------|--------|
| `design-data/` | Jig SVG, key positions, keyboard layout JSON (committed) |
| `fonts/` | Built-in outline TTFs (**not in git**; local fallback reads `apps/web/public/fonts`, Docker COPY at image build) |

The Docker image copies these in the runner stage of `docker/api.Dockerfile`.
