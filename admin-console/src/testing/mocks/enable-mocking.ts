import { env } from '@/config/env';
import { seedDb } from './db';

// The mock IS the backend here, gated behind a flag so a real deployment can
// ship without it.
export async function enableMocking(): Promise<void> {
  if (!env.ENABLE_API_MOCKING) return;
  const { worker } = await import('./browser');
  seedDb();
  await worker.start({ onUnhandledRequest: 'bypass' });
}
