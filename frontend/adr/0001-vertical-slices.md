# ADR-0001: Vertical slices

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The app has separate areas (dashboard, logs, alerts, reports, AI) that grow independently. A
layer-based layout (`components/`, `hooks/`, `api/` at the top level) mixes them together.

## Decision

- One folder per feature: `src/features/<slice>/` with `pages/`, `components/`, `api/`, `mocks/`,
  `types.ts`, `routes.tsx`, `index.ts`.
- Slices do not import from each other. From outside, a slice is imported only through `index.ts`.
- `src/shared/` holds only code used by 2+ slices (or a slice + `app/`). `shared/` never imports
  from `app/` or `features/`.
- `src/app/` is the shell: providers, router, layout, 404.
- Enforced by ESLint `import/no-restricted-paths` (`eslint.config.js`).

## Consequences

- \+ A feature can be changed or removed in one place.
- \+ Breaking the rules fails `npm run lint`.
- − Some code is duplicated until a second slice needs it.
