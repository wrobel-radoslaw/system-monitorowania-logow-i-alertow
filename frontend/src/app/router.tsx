import { Navigate, type RouteObject } from 'react-router';
import { aiRoutes } from '@/features/ai';
import { alertsRoutes } from '@/features/alerts';
import { dashboardRoutes } from '@/features/dashboard';
import { logsRoutes } from '@/features/logs';
import { reportsRoutes } from '@/features/reports';
import { AppLayout } from './layout/AppLayout';
import { NotFoundPage } from './NotFoundPage';

/** App route tree. Each slice contributes its routes through its public API (index.ts). */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      ...dashboardRoutes,
      ...logsRoutes,
      ...alertsRoutes,
      ...reportsRoutes,
      ...aiRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
