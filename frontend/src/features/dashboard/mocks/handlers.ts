import { http, HttpResponse, type AnyHandler } from 'msw';

/** GET /api/health. The Dashboard's event requests are mocked in the Logs slice. */
export const handlers: AnyHandler[] = [
  http.get('*/api/health', () => HttpResponse.json({ status: 'healthy', database: 'connected' })),
];
