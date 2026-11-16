import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW server for tests, combining the mock handlers of every slice. */
export const server = setupServer(...handlers);
