# ADR-0009: Testing with Vitest, Testing Library and MSW

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

Tests should check behaviour that users see, against a realistic API, and run fast.

## Decision

- Vitest (jsdom) + React Testing Library + user-event.
- The API is mocked at the HTTP level with MSW (ADR-0005), not by mocking modules.
- A test sits next to the file it tests (`Foo.tsx` + `Foo.test.tsx`).
- Helpers in `shared/test/`: `renderWithProviders`, `renderRoutes` (fresh QueryClient, no
  retries), viewport mock for `useDevice`.

## Consequences

- \+ Tests survive refactors, because they don't depend on implementation details.
- − MSW handlers must be kept up to date.
