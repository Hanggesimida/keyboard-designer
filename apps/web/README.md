# Keyboard Designer — Web

[English](README.md) | [简体中文](README.zh-CN.md)

Browser-based **keycap visual editor**: ANSI layouts, layers, per-key styling, canvas artwork, and PNG / SVG / JSON / jig export. Text outlining and jig generation run in the browser. This is the product app in the monorepo.

Back to the [repository README](../../README.md).

---

## Features

| Feature | Notes |
|---------|--------|
| **Layouts** | Built-in ANSI 60% / 68% / 81% / 87 TKL / 104 / 108 / 144, JSON-driven |
| **Layers** | Multiple keycap color and style overrides, managed in the layer panel |
| **Keycap styling** | Legend, font, weight, color, gradient, border, padding, alignment |
| **Batch edit** | Box-select or multi-select, then apply one style to many keys |
| **Canvas artwork** | Drop images on the board; transform and layer them |
| **Undo / redo** | Zustand + zundo (`Ctrl/⌘ + Z / Y`) |
| **PNG export** | Client-side snapshot of the current board |
| **SVG export** | opentype.js outlines text to `<path>` in the browser; falls back to `<text>` without a font file |
| **JSON import / export** | Serialize the design for backup and sharing |
| **Jig SVG** | Production jig generated in the browser from the design data |

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router + Turbopack) |
| UI | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/) |
| i18n | [next-intl](https://next-intl.dev/) — `en` default, `zh` with `/zh` prefix |
| State | [Zustand 5](https://zustand-demo.pmnd.rs/) + [zundo](https://github.com/charkour/zundo) |
| Gestures | [@use-gesture/react](https://use-gesture.netlify.app/), [@react-spring/web](https://www.react-spring.dev/) |
| Color | [colord](https://github.com/omgovich/colord) |
| Outline / jig | Browser opentype.js (`lib/export/browser/`) |
| Icons | [lucide-react](https://lucide.dev/) |
| Shared UI | `@workspace/ui` ([shadcn/ui](https://ui.shadcn.com/)) |

---

## Directory layout

```
apps/web/
├── app/
│   ├── [locale]/               # Locale-aware pages (home, /design, …)
│   └── layout.tsx              # Root layout
├── modules/
│   ├── home/                   # Marketing landing sections
│   └── design/
│       ├── components/         # Workspace, canvas, sidebars
│       ├── hooks/              # Viewport, box-select, pan, key editing
│       ├── store/              # Zustand store
│       ├── lib/                # Export helpers, SVG, gradients, geometry
│       └── data/               # Layout JSON, jig templates
├── i18n/                       # next-intl routing and request config
├── lib/
│   ├── export/                 # Browser text-to-path and jig
│   └── fonts/                  # Session fonts
├── messages/                   # en.json / zh.json copy
└── public/                     # Images, display fonts, models
```

Auth, profile, admin, and checkout routes still exist under `app/` but redirect to `/design` (and `/zh/design`). To restore the backend, see [legacy/README.md](../../legacy/README.md).

---

## Getting started

### Requirements

- **Node.js** >= 22
- **pnpm** 11.12.0 (`corepack enable` recommended)

No backend is required.

### Install

From the **monorepo root**:

```bash
pnpm install
```

### Dev server

```bash
pnpm dev
```

- `http://localhost:3000` — home (English)
- `http://localhost:3000/zh` — home (简体中文)
- `http://localhost:3000/design` — editor
- `http://localhost:3000/zh/design` — editor in 简体中文

### Production build

```bash
pnpm build
pnpm start
```

### Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

---

## Routes

| Route | Notes |
|-------|--------|
| `/` · `/zh` | Landing: hero, features, FAQ |
| `/design` · `/zh/design` | Keycap workspace (left sidebar / canvas / right sidebar) |

The editor is desktop-first (≥ 768px). On a small screen it asks you to switch to a larger device.

---

## Built-in layouts

| Layout ID | Notes |
|-----------|--------|
| `ansi-61` | 60% |
| `ansi-68` | 68% |
| `ansi-81` | 81% |
| `ansi-87` | TKL 87 |
| `ansi-104` | Full-size 104 |
| `ansi-108` | Full-size 108 (default) |
| `ansi-144` | 144-key |
