import { z } from 'zod';

// Vite exposes only vars prefixed `VITE_` on `import.meta.env`.
const schema = z.object({
  API_URL: z.string().min(1),
  ENABLE_API_MOCKING: z.boolean(),
});

export const env = schema.parse({
  API_URL: import.meta.env.VITE_API_URL ?? '/api',
  ENABLE_API_MOCKING: (import.meta.env.VITE_API_MOCKING ?? 'enabled') !== 'disabled',
});
