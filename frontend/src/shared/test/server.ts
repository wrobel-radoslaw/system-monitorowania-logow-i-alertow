import { setupServer } from 'msw/node';
import { handlers as aiHandlers } from '@/features/ai/mocks/handlers';
import { handlers as alertsHandlers } from '@/features/alerts/mocks/handlers';
import { handlers as dashboardHandlers } from '@/features/dashboard/mocks/handlers';
import { handlers as logsHandlers } from '@/features/logs/mocks/handlers';
import { handlers as reportsHandlers } from '@/features/reports/mocks/handlers';

/** MSW server for tests, combining the mock handlers of every slice. */
export const server = setupServer(
  ...dashboardHandlers,
  ...logsHandlers,
  ...alertsHandlers,
  ...reportsHandlers,
  ...aiHandlers,
);
