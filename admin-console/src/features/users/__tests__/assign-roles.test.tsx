import { describe, expect, test } from 'vitest';
import { appRender, screen, userEvent } from '@/testing/test-utils';
import { db } from '@/testing/mocks/db';
import { EditUser } from '../components/edit-user';

function seededIds() {
  const tenant = db.tenant.findFirst({ where: { name: { equals: 'acme' } } });
  const user = db.user.findFirst({ where: { username: { equals: 'jdoe' } } });
  if (!tenant || !user) throw new Error('seed data missing');
  return { tenantId: tenant.id, userId: user.id };
}

describe('EditUser — role assignment (integration)', () => {
  test('reflects assigned roles and saves a new assignment', async () => {
    const { tenantId, userId } = seededIds();
    appRender(<EditUser />, {
      route: `/tenants/${tenantId}/users/${userId}`,
      path: 'tenants/:tenantId/users/:userId',
    });

    // User details load.
    expect(await screen.findByRole('heading', { name: /user: jdoe/i })).toBeInTheDocument();

    // jdoe is seeded with the admin + viewer roles, but not developer.
    const developer = await screen.findByRole('checkbox', { name: /manage clients/i });
    expect(screen.getByRole('checkbox', { name: /full administrative access/i })).toBeChecked();
    expect(developer).not.toBeChecked();

    // Assign the developer role and persist.
    await userEvent.click(developer);
    await userEvent.click(screen.getByRole('button', { name: /save role assignment/i }));

    expect(await screen.findByText(/roles updated/i)).toBeInTheDocument();
  });
});
