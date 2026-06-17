import { env } from '@/config/env';
import { seedDb } from './db';

/**
 * Start the MSW worker and seed the in-memory backend in the browser.
 * This demo has no real server, so the mock IS the backend — gated behind a flag
 * so a real deployment could ship without it.
 */
export async function enableMocking(): Promise<void> {
  if (!env.ENABLE_API_MOCKING) return;
  const { worker } = await import('./browser');
  seedDb();
  await worker.start({ onUnhandledRequest: 'bypass' });
}
