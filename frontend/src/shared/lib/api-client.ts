const baseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** RFC 7807 error body returned by the backend. */
export type ProblemDetails = {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetails;

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

/** Error bodies are optional: some failures (e.g. from the dev proxy) are not JSON. */
async function readProblem(response: Response): Promise<ProblemDetails | undefined> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}

/** Text for the UI. Backend error text is Polish and the UI is English, so map the status. */
export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'The filters are not valid. Check the date range.';
    if (error.status === 404) return 'This item was not found.';
    if (error.status === 503) return 'The database is unavailable. Try again later.';
  }
  return 'Could not load the data. Check that the API is running.';
}

/**
 * Minimal fetch wrapper for the backend API.
 * `path` is relative to VITE_API_URL, e.g. apiFetch<EventDto>('/api/events/some-id').
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Request failed: ${response.status} ${response.statusText}`,
      await readProblem(response),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
