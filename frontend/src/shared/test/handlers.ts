import { handlers as aiHandlers } from '@/features/ai/mocks/handlers';
import { handlers as alertsHandlers } from '@/features/alerts/mocks/handlers';
import { handlers as dashboardHandlers } from '@/features/dashboard/mocks/handlers';
import { handlers as logsHandlers } from '@/features/logs/mocks/handlers';
import { handlers as reportsHandlers } from '@/features/reports/mocks/handlers';

/** The mock handlers of every slice, used by the test server and the browser worker. */
export const handlers = [
  ...dashboardHandlers,
  ...logsHandlers,
  ...alertsHandlers,
  ...reportsHandlers,
  ...aiHandlers,
];
