import { describe, expect, test } from 'vitest';
import { appRender, screen, userEvent } from '@/testing/test-utils';
import { CreateTenant } from '../components/create-tenant';

describe('CreateTenant (integration)', () => {
  test('blocks submit and shows a validation error for an empty name', async () => {
    appRender(<CreateTenant />, { route: '/tenants/new' });

    await userEvent.click(screen.getByRole('button', { name: /create tenant/i }));
    expect(await screen.findByText(/tenant name is required/i)).toBeInTheDocument();
  });

  test('accepts a valid name and submits', async () => {
    appRender(<CreateTenant />, { route: '/tenants/new' });

    await userEvent.type(screen.getByLabelText(/tenant name/i), 'new-tenant');
    await userEvent.click(screen.getByRole('button', { name: /create tenant/i }));

    // Toast comes from the test harness' <Notifications/>.
    expect(await screen.findByText(/tenant "new-tenant" created/i)).toBeInTheDocument();
  });
});
