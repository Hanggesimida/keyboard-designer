# shadcn/ui monorepo template

This is a Next.js monorepo template with shadcn/ui.

## Adding components

From the monorepo root, add a shadcn component to the shared UI package:

```bash
pnpm dlx shadcn@latest add progress -c packages/ui
```

This places generated files under `packages/ui` (for example `packages/ui/src/components`).

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
