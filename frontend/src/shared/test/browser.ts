import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** MSW worker for the dev server, enabled with VITE_USE_MOCKS=true. */
export const worker = setupWorker(...handlers);
