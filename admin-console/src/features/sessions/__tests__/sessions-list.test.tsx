import { describe, expect, test } from 'vitest';
import { appRender, screen, userEvent } from '@/testing/test-utils';
import { db } from '@/testing/mocks/db';
import { SessionsList } from '../components/sessions-list';

function acmeId() {
  const tenant = db.tenant.findFirst({ where: { name: { equals: 'acme' } } });
  if (!tenant) throw new Error('seed data missing');
  return tenant.id;
}

describe('SessionsList', () => {
  test('lists active sessions with the clients they signed into', async () => {
    appRender(<SessionsList />, {
      route: `/tenants/${acmeId()}/sessions`,
      path: 'tenants/:tenantId/sessions',
    });

    expect(await screen.findByText('jdoe')).toBeInTheDocument();
    expect(screen.getByText('Account Console')).toBeInTheDocument();
  });

  test('revokes a session', async () => {
    appRender(<SessionsList />, {
      route: `/tenants/${acmeId()}/sessions`,
      path: 'tenants/:tenantId/sessions',
    });

    await userEvent.click(await screen.findByRole('button', { name: /revoke/i }));

    expect(await screen.findByText(/session revoked/i)).toBeInTheDocument();
  });
});
