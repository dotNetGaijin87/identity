import { authHandlers } from './handlers/auth';
import { tenantHandlers } from './handlers/tenants';
import { roleHandlers } from './handlers/roles';
import { clientHandlers } from './handlers/clients';
import { userHandlers } from './handlers/users';
import { sessionHandlers } from './handlers/sessions';

// Full set — keeps the Vitest server self-contained, independent of the backend.
export const handlers = [
  ...authHandlers,
  ...tenantHandlers,
  ...roleHandlers,
  ...userHandlers,
  ...clientHandlers,
  ...sessionHandlers,
];

// Dev set — every resource now has a real backend, so nothing is mocked in the
// running app. Kept as the hook for incremental migration.
export const devHandlers: typeof handlers = [];
