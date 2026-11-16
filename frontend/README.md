# Frontend

UI for the log and alert monitoring system.

Stack: React 19, TypeScript, Vite, React Router 7, TanStack Query, Tailwind CSS v4, Vitest + React
Testing Library + MSW, ESLint, Prettier.

Decisions and their reasons: [adr/](adr/) (one file per decision, template in
`adr/0000-template.md`).

## Run

Requires Node 22.

```bash
cd frontend
npm install
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
npm run dev            # http://localhost:5173
```

Restart `npm run dev` after changing `.env`.

| Variable         | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| `VITE_USE_MOCKS` | `true`: API mocked in the browser (MSW), no backend needed                  |
|                  | `false`: requests go to the backend on `http://localhost:5136` (Vite proxy) |
| `VITE_API_URL`   | Leave empty in dev. The backend has no CORS, so calls must use the proxy    |

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

## Current state

**Connected to the API** (or MSW when mocks are on):

- Logs list with filters and pagination: `GET /api/events`
- Event details: `GET /api/events/{eventId}`
- Status change (Acknowledge / Resolve / Reopen): `PATCH /api/events/{eventId}/status`
- API status in the sidebar / top bar: `GET /api/health`, every 30 s

**Fake data only** (static, also in production builds):

| Page                        | File                                        |
| --------------------------- | ------------------------------------------- |
| Dashboard                   | `src/features/dashboard/mocks/fake-data.ts` |
| Alerts, Dashboard's alerts  | `src/shared/mocks/fake-alerts.ts`           |
| Reports                     | `src/features/reports/mocks/fake-data.ts`   |
| AI Analysis (all four tabs) | `src/features/ai/mocks/fake-data.ts`        |

**Not done:**

- Logs search works only with mocks; the API has no `search` filter.
- Alerts "Acknowledge" lasts only until you leave the page.
- "New alert rule", "Download PDF", "Create ticket" do nothing.
- "Generate report" and "Regenerate" only change text on the page.
- No authentication.

## Routes

| Path                                                                | Page                         |
| ------------------------------------------------------------------- | ---------------------------- |
| `/`                                                                 | redirects to `/dashboard`    |
| `/dashboard`, `/logs`, `/alerts`, `/raports`                        | slice pages                  |
| `/logs/:eventId`                                                    | event details                |
| `/ai`                                                               | redirects to `/ai/summaries` |
| `/ai/summaries`, `/ai/anomalies`, `/ai/root-cause`, `/ai/assistant` | AI Analysis tabs             |
| `*`                                                                 | 404                          |

## Structure

```
src/
  app/        shell: providers, router, layout, 404
  features/   one folder per slice: dashboard, logs, alerts, reports, ai
    <slice>/  index.ts, routes.tsx, pages/, components/, api/, hooks/, types.ts, mocks/
  shared/     ui/, lib/, mocks/, test/ (only code used by 2+ slices)
  styles/     index.css (Tailwind + design tokens), design handoff notes
```

Rules (checked by `npm run lint`):

- Slices do not import from each other.
- From outside a slice, import only its `index.ts` (e.g. `@/features/logs`).
- `shared/` only for code used by 2+ slices; it never imports from `app/` or `features/`.
- Tests sit next to the file they test. `@/` maps to `src/`.

Adding a slice: copy `features/dashboard`, add its routes to `app/router.tsx`, a nav item to
`app/layout/nav-items.ts`, and its `mocks/handlers.ts` to `shared/test/handlers.ts`.

## Mock events

`src/features/logs/mocks/events.json` is generator output. To regenerate it, run from the repo root:

```bash
python tools/event-generator/generate_events.py --count 100 --seed 1 --with-event-id --output frontend/src/features/logs/mocks/events.json
```

`events.ts` adds statuses and 10 newer rows on top.

## Design

Colors only from the tokens in `src/styles/index.css` (dark default, light via `data-theme`).
Details: [ADR-0008](adr/0008-design-tokens-theme-layout.md) and
`src/styles/log-monitor-design-handoff.md`.
