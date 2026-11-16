# ADR-0003: Server state in TanStack Query

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

Almost all data comes from the API. It needs caching, refetching, loading and error states, and
updates after mutations.

## Decision

- All server data goes through TanStack Query. There is no global store (Redux, Zustand).
- Each slice keeps `queryOptions` factories in `api/` (e.g. `logs/api/events-api.ts`).
- Query keys: `['events', 'list', query]`, `['events', 'detail', id]`, `['health']`.
  `eventListsKey` invalidates every list at once.
- Mutations update the detail cache with `setQueryData` and invalidate the lists.
- UI state (filters, page) lives in the URL (ADR-0006); local state in `useState`.

## Consequences

- \+ No hand-written fetch/loading/cache code.
- − Query keys must stay consistent; they are defined only in `api/`.
