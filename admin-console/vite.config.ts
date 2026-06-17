/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Same-origin proxy to the Go backend so the httpOnly session cookie flows.
    // MSW (in the browser) handles still-mocked resources; requests it bypasses
    // fall through here to the real API.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    css: false,
    // Playwright specs live in e2e/ and must not be picked up by Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
});
