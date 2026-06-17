import { authHandlers } from './handlers/auth';
import { tenantHandlers } from './handlers/tenants';
import { roleHandlers } from './handlers/roles';
import { clientHandlers } from './handlers/clients';
import { userHandlers } from './handlers/users';

// Full set — used by the test server so Vitest stays self-contained and
// independent of the backend.
export const handlers = [
  ...authHandlers,
  ...tenantHandlers,
  ...roleHandlers,
  ...userHandlers,
  ...clientHandlers,
];

// Dev set — every resource now has a Go backend module, so nothing is mocked in
// the running app. (Kept for the incremental-migration mechanism.)
export const devHandlers: typeof handlers = [];
