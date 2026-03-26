import { expect, test } from '@playwright/test';

test.describe('Dashboard Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            isAuthenticated: true,
            user: {
              id: 'user-1',
              username: 'admin',
              full_name: 'Administrator',
              is_active: true,
              role: {
                name: 'Admin',
                permissions: [
                  'pos:read',
                  'pos:create',
                  'report:view',
                  'settings:read',
                  'stock:read',
                  'stock:adjust',
                  'customer:read',
                  'customer:edit',
                  'supplier:read',
                  'product:read',
                  'purchase:read',
                  'pos:void',
                ],
              },
            },
          },
          version: 0,
        }),
      );
    });
  });

  test('should navigate dashboard CTAs to app routes', async ({ page }) => {
    await page.goto('/app');

    await page.getByRole('button', { name: /Buka Kasir/i }).click();
    await expect(page).toHaveURL(/\/app\/pos$/);

    await page.goto('/app');
    await page.getByRole('button', { name: /Lihat Semua Laporan/i }).click();
    await expect(page).toHaveURL(/\/app\/reports$/);
  });
});
