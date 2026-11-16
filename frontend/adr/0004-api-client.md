# ADR-0004: One API client with ProblemDetails errors

- **Status:** Accepted
- **Date:** 2026-11-16

## Context

The backend returns errors as RFC 7807 ProblemDetails, with text in Polish. The UI is in English.
The backend has no CORS setup.

## Decision

- Every call goes through `apiFetch` (`shared/lib/api-client.ts`): JSON headers, base URL from
  `VITE_API_URL`.
- A non-2xx response throws `ApiError` with `status` and the parsed `problem`.
- `getErrorMessage` maps the HTTP status (400, 404, 409, 503) to English UI text. Backend text is
  not shown.
- In dev, `VITE_API_URL` stays empty and Vite proxies `/api` to `http://localhost:5136`.

## Consequences

- \+ One place for headers, errors and the base URL.
- \+ No CORS needed in dev.
- − Production needs a reverse proxy or CORS on the backend.
