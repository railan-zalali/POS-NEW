import { expect, test } from '@playwright/test';

test.describe('Purchase Workflow', () => {
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
                  'purchase:read',
                  'purchase:create',
                  'purchase:edit',
                  'purchase:approve',
                  'product:read',
                  'supplier:read',
                ],
              },
            },
          },
          version: 0,
        }),
      );
    });
  });

  test('should create and send a PO so it can be received', async ({ page }) => {
    await page.goto('/app/purchase');

    await page.evaluate(async () => {
      const [{ db }, { seedDummyData }] = await Promise.all([
        import('/src/lib/db/dexie.ts'),
        import('/src/lib/db/dummyData.ts'),
      ]);

      await db.purchase_return_items.clear();
      await db.purchase_returns.clear();
      await db.goods_receipt_items.clear();
      await db.goods_receipts.clear();
      await db.purchase_order_items.clear();
      await db.purchase_orders.clear();

      await seedDummyData();
    });

    await page.reload();

    await page.getByRole('button', { name: /PO Baru/i }).click();

    const comboboxes = page.getByRole('combobox');
    await comboboxes.nth(0).click();
    await page.getByRole('option', { name: /PT Pupuk Indonesia/i }).click();

    await comboboxes.nth(1).click();
    await page.getByRole('option', { name: /Urea Subsidi/i }).click();

    await comboboxes.nth(2).click();
    await page.getByRole('option', { name: 'Kg', exact: true }).click();

    await page.getByRole('button', { name: /Simpan PO/i }).click();

    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText(/PO-\d{8}-\d{3}/);
    await expect(firstRow).toContainText(/PT Pupuk Indonesia/i);

    const poNumber = (await firstRow.locator('td').nth(0).textContent())?.trim();
    expect(poNumber).toBeTruthy();

    await firstRow.getByRole('button', { name: /Kirim/i }).click();
    await expect(firstRow).toContainText(/Dikirim/i);

    await page.goto('/app/purchase/receipts');
    await page.getByRole('button', { name: /Terima Barang/i }).click();
    await page.getByRole('combobox').first().click();

    await expect(page.getByRole('option', { name: new RegExp(poNumber!, 'i') })).toBeVisible();
  });
});
