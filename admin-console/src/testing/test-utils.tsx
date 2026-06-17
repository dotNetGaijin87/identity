import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Notifications } from '@/components/notifications';

type RenderOptions = {
  /** Initial URL for the in-memory router (e.g. '/tenants/tenant_2/users'). */
  route?: string;
  /** Route pattern the `ui` is mounted under, so `useParams()` resolves. */
  path?: string;
};

/**
 * Render a component inside the same providers the app uses (fresh query client,
 * router), so integration tests mirror production. Retries are off for fast failures.
 */
export function appRender(ui: ReactElement, { route = '/', path }: RenderOptions = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>
        {path ? (
          <Routes>
            <Route path={path} element={children} />
            <Route path="*" element={children} />
          </Routes>
        ) : (
          children
        )}
        <Notifications />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
