import { Navigate, type RouteObject } from 'react-router';
import { AiLayout } from './AiLayout';
import { AnomaliesPage } from './anomalies/AnomaliesPage';
import { AssistantPage } from './assistant/AssistantPage';
import { RootCausePage } from './root-cause/RootCausePage';
import { SummariesPage } from './summaries/SummariesPage';

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
