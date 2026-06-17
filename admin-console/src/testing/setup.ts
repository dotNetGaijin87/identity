import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import { seedDb } from './mocks/db';
import { notificationsStore } from '@/stores/notifications';

// One mock layer for every test. Fail loudly on requests no handler covers.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

beforeEach(() => {
  seedDb(); // deterministic data + cleared session before each test
  notificationsStore.getState().clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
