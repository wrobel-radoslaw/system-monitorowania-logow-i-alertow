# ADR-0006: Logs filters and page live in the URL

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

Users filter logs by machine, severity, status and date, and share or bookmark the view. The Back
button should restore the previous filters.

## Decision

- Filters and `page` are search params, read by `readFilters` / `readPage` (`logs/filters.ts`).
- Values that are invalid (unknown enum, bad date, page < 1) are ignored, not shown as errors.
- Date inputs use local time and are sent to the API as UTC ISO strings.
- `PAGE_SIZE = 10`.
- `search` is sent only when mocks are on; the real API has no `search` filter yet.

## Consequences

- \+ Links to filtered views work; Back/Forward work.
- \+ The filters are part of the query key, so each filter set is cached separately.
- − Every filter must be kept as a string in the URL.
