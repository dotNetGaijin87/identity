import { describe, expect, test } from 'vitest';
import { appRender, screen, userEvent } from '@/testing/test-utils';
import { db } from '@/testing/mocks/db';
import { CreateClient } from '../components/create-client';

function acmeId() {
  const tenant = db.tenant.findFirst({ where: { name: { equals: 'acme' } } });
  if (!tenant) throw new Error('seed data missing');
  return tenant.id;
}

describe('CreateClient (integration, expanded settings)', () => {
  test('renders the grouped setting sections', async () => {
    const tenantId = acmeId();
    appRender(<CreateClient />, {
      route: `/tenants/${tenantId}/clients/new`,
      path: 'tenants/:tenantId/clients/new',
    });

    expect(screen.getByText('Capabilities')).toBeInTheDocument();
    expect(screen.getByText(/authentication & security/i)).toBeInTheDocument();
    expect(screen.getByText(/tokens & session/i)).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /device authorization grant/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/require pkce/i)).toBeInTheDocument();
  });

  test('creates a client with a redirect URI and a capability enabled', async () => {
    const tenantId = acmeId();
    appRender(<CreateClient />, {
      route: `/tenants/${tenantId}/clients/new`,
      path: 'tenants/:tenantId/clients/new',
    });

    await userEvent.type(screen.getByLabelText(/client id/i), 'my-app');
    await userEvent.click(screen.getByRole('button', { name: /add redirect uri/i }));
    await userEvent.type(
      screen.getByPlaceholderText(/app\.example\.com\/callback/i),
      'https://my-app.example.com/callback',
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /implicit flow/i }));
    await userEvent.click(screen.getByRole('button', { name: /create client/i }));

    expect(await screen.findByText(/client "my-app" created/i)).toBeInTheDocument();
  });
});
