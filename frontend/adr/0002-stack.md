# ADR-0002: Stack: Vite, React, TypeScript, React Router

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

A single-page UI for a REST API (.NET backend). No SEO or server rendering needed.

## Decision

- Vite + React 19 + TypeScript (strict).
- React Router 7 in data router mode. `app/router.tsx` combines the routes exported by each slice.
- Path alias `@/` → `src/`.
- ESLint + Prettier for code style.

## Consequences

- \+ Fast dev server; a static build that can be hosted anywhere.
- − No SSR. Not needed for an internal tool.
