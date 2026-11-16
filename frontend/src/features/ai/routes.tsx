import { Navigate, type RouteObject } from 'react-router';
import { AiLayout } from './components/AiLayout';
import { AnomaliesPage } from './pages/AnomaliesPage';
import { AssistantPage } from './pages/AssistantPage';
import { RootCausePage } from './pages/RootCausePage';
import { SummariesPage } from './pages/SummariesPage';

export const aiRoutes: RouteObject[] = [
  {
    path: 'ai',
    element: <AiLayout />,
    children: [
      { index: true, element: <Navigate to="summaries" replace /> },
      { path: 'summaries', element: <SummariesPage /> },
      { path: 'anomalies', element: <AnomaliesPage /> },
      { path: 'root-cause', element: <RootCausePage /> },
      { path: 'assistant', element: <AssistantPage /> },
    ],
  },
];
