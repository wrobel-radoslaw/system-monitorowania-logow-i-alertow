import type { RouteObject } from 'react-router';
import { AlertsPage } from './pages/AlertsPage';

export const alertsRoutes: RouteObject[] = [{ path: 'alerts', element: <AlertsPage /> }];
