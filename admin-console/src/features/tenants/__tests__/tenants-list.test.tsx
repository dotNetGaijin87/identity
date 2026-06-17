import { describe, expect, test } from 'vitest';
import { http, HttpResponse } from 'msw';
import { appRender, screen } from '@/testing/test-utils';
import { server } from '@/testing/mocks/server';
import { TenantsList } from '../components/tenants-list';

describe('TenantsList (integration, mocked API)', () => {
  test('renders tenants loaded from the API', async () => {
    appRender(<TenantsList />, { route: '/tenants' });

    expect(await screen.findByRole('heading', { name: /tenants/i })).toBeInTheDocument();
    expect(await screen.findByText('system')).toBeInTheDocument();
    expect(await screen.findByText('acme')).toBeInTheDocument();
  });

  test('shows an error state when the API fails', async () => {
    server.use(
      http.get('*/api/tenants', () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    appRender(<TenantsList />, { route: '/tenants' });
    expect(await screen.findByText(/load tenants/i)).toBeInTheDocument();
  });
});
