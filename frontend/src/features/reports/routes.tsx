import type { RouteObject } from 'react-router';
import { ReportsPage } from './pages/ReportsPage';

export const reportsRoutes: RouteObject[] = [{ path: 'reports', element: <ReportsPage /> }];
