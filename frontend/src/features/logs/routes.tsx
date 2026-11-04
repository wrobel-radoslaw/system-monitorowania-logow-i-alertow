import type { RouteObject } from 'react-router';
import { LogsPage } from './pages/LogsPage';

export const logsRoutes: RouteObject[] = [{ path: 'logs', element: <LogsPage /> }];
