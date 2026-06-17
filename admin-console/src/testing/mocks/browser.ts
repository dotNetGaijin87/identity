import { setupWorker } from 'msw/browser';
import { devHandlers } from './handlers';

// Dev worker: mocks only the resources whose Go module hasn't landed yet.
// Auth (and anything else removed from devHandlers) hits the real backend.
export const worker = setupWorker(...devHandlers);
