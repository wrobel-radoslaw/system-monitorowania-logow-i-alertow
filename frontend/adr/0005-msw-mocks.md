# ADR-0005: MSW for mocks; fake data for pages without an API

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The frontend is built in parallel with the backend. Tests and local dev must work without it.

## Decision

- Each slice has `mocks/handlers.ts` (MSW), following `docs/openapi.yaml`.
- The same handlers serve tests (Node, `shared/test/server.ts`) and the browser
  (`shared/test/browser.ts`).
- Browser mocks run only when `import.meta.env.DEV && VITE_USE_MOCKS === 'true'` (`main.tsx`). The
  import is dropped from production builds.
- Pages whose API does not exist yet use static `mocks/fake-data.ts` (and
  `shared/mocks/fake-alerts.ts`). These are imported directly, so they **are** in production builds.

## Consequences

- \+ Pages use the same API calls with mocks and with the real backend.
- \+ Tests check real HTTP behaviour (status codes, 409, ProblemDetails).
- − Mocks can drift from the backend; keep them in line with `openapi.yaml`.
- − Fake data must be removed once each real endpoint exists.
