import type { RouteObject } from 'react-router';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { LogsPage } from './pages/LogsPage';

export const logsRoutes: RouteObject[] = [
  { path: 'logs', element: <LogsPage /> },
  { path: 'logs/:eventId', element: <EventDetailsPage /> },
];
