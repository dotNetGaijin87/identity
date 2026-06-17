import { test, expect } from '@playwright/test';

test.describe('admin console critical flows', () => {
  test('protects the admin area and logs in', async ({ page }) => {
    // Unauthenticated access to a protected route redirects to login.
    await page.goto('/tenants');
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin');
    await page.getByRole('button', { name: /log in/i }).click();

    // Lands on the intended page and sees seeded data.
    await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'acme' })).toBeVisible();
  });

  test('creates a tenant', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/username/i).fill('admin');
    await page.getByLabel(/password/i).fill('admin');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /tenants/i })).toBeVisible();

    await page.getByRole('link', { name: /create tenant/i }).click();
    await page.getByLabel(/tenant name/i).fill('e2e-tenant');
    await page.getByRole('button', { name: /create tenant/i }).click();

    // Redirected into the new tenant's users screen.
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
  });
});
