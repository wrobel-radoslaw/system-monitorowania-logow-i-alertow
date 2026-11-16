import { http, HttpResponse, type AnyHandler } from 'msw';

/** GET /api/health, used by the app shell's ingest status (not by any one slice). */
export const healthHandlers: AnyHandler[] = [
  http.get('*/api/health', () => HttpResponse.json({ status: 'healthy', database: 'connected' })),
];
