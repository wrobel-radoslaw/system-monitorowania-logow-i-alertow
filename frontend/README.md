# Frontend

React + TypeScript (Vite) UI for the log and alert monitoring system. Logs and event details use
the API, or a mock of it. **Dashboard, Alerts, Raports and AI Analysis show fake data** for now (see
below). The backend is a separate project.

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

## Mock data and the backend

| `.env` value           | Where `/api` requests go                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| `VITE_USE_MOCKS=true`  | Mock handlers in the browser (MSW). No backend needed. Default in example |
| `VITE_USE_MOCKS=false` | The backend at `http://localhost:5136`, through the Vite dev server proxy |

Pages use the same API calls in both modes. Restart `npm run dev` after changing `.env`. The mock
handlers and mock events are never included in a production build. Vite does copy the
`mockServiceWorker.js` file from `public/`, but nothing registers it.

Search on the Logs page only appears with mocks on, because the real API has no `search` filter yet.

Leave `VITE_API_URL` empty in development so requests use the proxy. The backend has no CORS setup,
so calling it directly from the browser fails.

The mock events in `src/shared/mocks/events.json` are generator output. To regenerate them, run this
from the repository root:

```bash
python tools/event-generator/generate_events.py --count 100 --seed 1 --with-event-id --output frontend/src/shared/mocks/events.json
```

`src/shared/mocks/events.ts` adds a fixed mix of statuses, because the generator has no status field,
and 10 newer fake rows that fill the first Logs page. The generated events are dated January 2026, so
the Logs page applies no default date range.

### Fake data

These pages show static fake data in both modes, **including production builds**. It was written to
design the pages and none of it is real. Replace each file when its API exists.

| Page                        | Fake data file                        | Later source                |
| --------------------------- | ------------------------------------- | --------------------------- |
| Dashboard                   | `src/features/dashboard/fake-data.ts` | an aggregates endpoint      |
| Alerts, Dashboard's alerts  | `src/shared/mocks/fake-alerts.ts`     | `GET /api/alerts` and PATCH |
| Raports                     | `src/features/reports/fake-data.ts`   | not planned yet             |
| AI Analysis (all four tabs) | `src/features/ai/fake-data.ts`        | M3 (F-09)                   |

Not connected yet: "New alert rule", "Download PDF" and "Create ticket" do nothing. "Acknowledge"
only changes the page until you leave it. "Generate report" and "Regenerate" only change text on the
page.

## Scripts

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
| `/dashboard`, `/logs`, `/alerts`, `/raports`                        | slice pages                  |
| `/logs/:eventId`                                                    | event details                |
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
    ui/         PageHeader, Card, Button, Pill, Badge, Input, ProgressBar, Tabs, EmptyState,
                Loading, ErrorState
    lib/        api-client, events-api, format, query-client, chart (Chart.js registration)
    types/      API contract types used by 2+ slices
    mocks/      seeded mock events, fake alerts
    test/       setup, MSW server and browser worker, render helpers
  styles/       index.css (Tailwind + design tokens)
```

Rules:

- A slice is self-contained. **Slices must not import from each other.**
- Outside a slice, import it **only through its `index.ts`** (e.g. `@/features/logs`).
  `app/router.tsx` composes the routes exported by each slice.
- Code goes to `shared/` only when **2+ slices** use it. `shared/lib` and `shared/ui` never
  import from `app/` or `features/`.
- The only exception: `shared/test/handlers.ts` imports each slice's `mocks/handlers.ts`.
- Tests sit **next to the file they test** (`Foo.tsx` + `Foo.test.tsx`).
- Path alias: `@/` maps to `src/`.

These rules are enforced by ESLint (`import/no-restricted-paths` in `eslint.config.js`). It
resolves real file paths, so both `@/...` and relative imports are checked. New slice folders are
picked up automatically.

### Adding a slice

1. Copy the structure of `features/dashboard`.
2. Export its routes from `index.ts` and spread them into `app/router.tsx`.
3. Add a nav item in `app/layout/Sidebar.tsx`.
4. Add its `mocks/handlers.ts` to `shared/test/handlers.ts`.

### Charts

`shared/lib/chart.ts` registers Chart.js components and dark defaults. A component that renders a
chart must `import '@/shared/lib/chart'` first. It is not imported in `main.tsx` so Chart.js stays
out of the initial bundle.

## Design tokens

Defined with `@theme` in `src/styles/index.css`. Only these colors exist: the default Tailwind
palette is removed. Use them as utilities, e.g. `bg-bg`, `text-muted`, `border-border`,
`bg-accent-soft`.

| Token         | Dark (default)        | Light                 | Used for                           |
| ------------- | --------------------- | --------------------- | ---------------------------------- |
| `bg`          | `#000000`             | `#ffffff`             | page background                    |
| `surface`     | `#0b0b0b`             | `#fafafa`             | cards, tables                      |
| `surface2`    | `#141414`             | `#f2f2f2`             | progress tracks, assistant bubbles |
| `border`      | `#222222`             | `#e4e4e7`             | dividers, card borders             |
| `text`        | `#ffffff`             | `#0a0a0a`             | primary text                       |
| `muted`       | `#a3a3a3`             | `#52525b`             | secondary text, inactive nav/tabs  |
| `hover`       | `#121212`             | `#f4f4f5`             | hover background                   |
| `accent`      | `#22c55e`             | `#15803d`             | active underline, primary, charts  |
| `accent-soft` | `rgba(34,197,94,.12)` | `rgba(21,128,61,.10)` | active pill, user chat bubble      |
| `on-accent`   | `#000000`             | `#ffffff`             | text on primary button             |
| `success`     | `#4ade80`             | `#15803d`             | OK, Resolved, Stable               |
| `danger`      | `#f87171`             | `#b91c1c`             | errors, critical                   |
| `warn`        | `#fbbf24`             | `#a16207`             | warnings                           |
| `info`        | `#60a5fa`             | `#1d4ed8`             | info level                         |

Fonts: `font-sans` (Segoe UI first) and `font-mono` at 13px for log lines and service names.

The theme is set by `data-theme` on `<html>`. On first load it comes from the saved choice, otherwise
dark (inline script in `index.html`). The sun/moon button in the sidebar switches it and saves the
choice in `localStorage`.

Design rules:

- **Active nav item or tab:** a 2px accent underline on the label's span, exactly as wide as the
  text. There is no left bar.
- **Hover:** nav, tabs, buttons and pills get `bg-hover` and text color over 150ms. Hoverable cards
  get a `muted` border. Table rows get `bg-hover` over 100ms. Primary buttons get brighter.
- **Focus:** every focusable element gets a 2px accent outline (`:focus-visible`).
- **Corners:** cards 12px, buttons and inputs 8px, badges and pills fully rounded. No shadows.
- **Severity:** use `Badge`, which always shows the word along with the color.

Layout: a wrapping row with a 240px sidebar and a 1px border. Below about 800px the sidebar stacks
above the content. Content is at most 1200px wide.
