# Frontend

React + TypeScript (Vite) UI for the log and alert monitoring system. This is the **skeleton**:
layout, navigation, routing, empty pages and tooling. No data, charts or API calls yet. The
backend is a separate project.

Stack: React, React Router (data router), TanStack Query, Tailwind CSS v4, Chart.js +
react-chartjs-2, Vitest + React Testing Library + MSW, ESLint, Prettier.

## Running

Requires Node 22.

```bash
cd frontend
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev            # http://localhost:5173
```

`VITE_API_URL` in `.env` is the backend base URL used by `shared/lib/api-client.ts`.

| Script               | What it does                       |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Dev server                         |
| `npm run build`      | Type-check + production build      |
| `npm run preview`    | Serve the production build         |
| `npm test`           | Run all tests once                 |
| `npm run test:watch` | Tests in watch mode                |
| `npm run lint`       | ESLint (includes slice boundaries) |
| `npm run format`     | Prettier                           |
| `npm run typecheck`  | TypeScript only                    |

## Routes

| Path                                                                | Page                         |
| ------------------------------------------------------------------- | ---------------------------- |
| `/`                                                                 | redirects to `/dashboard`    |
| `/dashboard`, `/logs`, `/alerts`, `/reports`                        | slice pages                  |
| `/ai`                                                               | redirects to `/ai/summaries` |
| `/ai/summaries`, `/ai/anomalies`, `/ai/root-cause`, `/ai/assistant` | AI Analysis tabs             |
| `*`                                                                 | 404                          |

## Folder structure: vertical slices

```
src/
  app/          app shell: providers, router, layout (sidebar), 404
  features/     one folder per slice: dashboard, logs, alerts, reports, ai
    <slice>/
      index.ts        public API: exports the slice's routes only
      routes.tsx
      pages/          pages + colocated tests
      components/ api/ hooks/
      types.ts
      mocks/handlers.ts   MSW handlers for tests
  shared/
    ui/         PageHeader, EmptyState, Tabs
    lib/        api-client, query-client, chart (Chart.js registration)
    test/       setup, MSW server, render helpers
  styles/       index.css (Tailwind + design tokens)
```

Rules:

- A slice is self-contained. **Slices must not import from each other.**
- Outside a slice, import it **only through its `index.ts`** (e.g. `@/features/logs`).
  `app/router.tsx` composes the routes exported by each slice.
- Code goes to `shared/` only when **2+ slices** use it. `shared/lib` and `shared/ui` never
  import from `app/` or `features/`.
- The only exception: `shared/test/server.ts` imports each slice's `mocks/handlers.ts`.
- Tests sit **next to the file they test** (`Foo.tsx` + `Foo.test.tsx`).
- Path alias: `@/` maps to `src/`.

These rules are enforced by ESLint (`import/no-restricted-paths` in `eslint.config.js`). It
resolves real file paths, so both `@/...` and relative imports are checked. New slice folders are
picked up automatically.

### Adding a slice

1. Copy the structure of `features/dashboard`.
2. Export its routes from `index.ts` and spread them into `app/router.tsx`.
3. Add a nav item in `app/layout/Sidebar.tsx`.
4. Add its `mocks/handlers.ts` to `shared/test/server.ts`.

### Charts

`shared/lib/chart.ts` registers Chart.js components and dark defaults. A component that renders a
chart must `import '@/shared/lib/chart'` first. It is not imported in `main.tsx` so Chart.js stays
out of the initial bundle.

## Design tokens

Defined with `@theme` in `src/styles/index.css`. Only these colors exist: the default Tailwind
palette is removed. Use them as utilities, e.g. `bg-background`, `text-text-muted`,
`border-border`, `border-accent`.

| Token               | Dark (default) | Light     |
| ------------------- | -------------- | --------- |
| `background`        | `#000000`      | `#FFFFFF` |
| `text-primary`      | `#FFFFFF`      | `#000000` |
| `text-muted`        | `#A1A1A1`      | `#525252` |
| `accent`            | `#089925`      | `#089925` |
| `border`            | `#1F1F1F`      | `#E5E5E5` |
| `severity-critical` | `#DC2626`      | `#DC2626` |
| `severity-warning`  | `#EAB308`      | `#EAB308` |
| `severity-info`     | `#A1A1A1`      | `#525252` |

Severity colors are reserved for alerts and are not used yet.

The theme is set by `data-theme` on `<html>`. On first load it comes from the saved choice or the
system preference (inline script in `index.html`). The "Light theme" / "Dark theme" button in the
sidebar switches it and saves the choice in `localStorage`.

Design rules: no border radius, shadows, gradients, transitions/animations, icons, pills or
badges. Nav and tab items are muted. On hover only the text turns primary. The active item is
primary text with a 2px accent bar: left edge in the sidebar, underneath for tabs and for the
mobile top bar.

Layout: on desktop (`lg`, 1024px and up) there is a fixed 240px sidebar with a 1px border. Below
that, the sidebar becomes a top bar with a horizontally scrollable nav row.
