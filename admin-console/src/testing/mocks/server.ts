import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** MSW server for the Node test environment (Vitest). */
export const server = setupServer(...handlers);
