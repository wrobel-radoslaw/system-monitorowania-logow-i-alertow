# ADR-0007: Event status changes with optimistic concurrency

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

Events (logs) must not be edited. Operators only triage them. Two operators can act on the same
event at the same time.

## Decision

- The only write is `PATCH /api/events/{eventId}/status` with `{ expectedStatus, status }`.
  Statuses: `NEW`, `ACKNOWLEDGED`, `RESOLVED`.
- The backend updates the row only if the current status equals `expectedStatus`; otherwise it
  returns `409 Conflict`.
- `StatusActions` (`logs/components/StatusActions.tsx`) sends the status it shows. On 409 it
  refetches the event and lists and shows "Someone else changed this event's status."
- The UI offers only these moves: NEW → Acknowledge / Resolve, ACKNOWLEDGED → Resolve,
  RESOLVED → Reopen. The API itself allows any change.

## Consequences

- \+ No lost updates, no locks.
- \+ Log content stays immutable.
- − The user has to retry after a conflict.
