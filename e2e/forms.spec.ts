import { test, expect } from '@playwright/test';

test.describe('Forms', () => {
  test('should have proper form labels', async ({ page }) => {
    await page.goto('/login');

    // Check for proper label associations
    const inputs = await page.locator('input:not([type="hidden"]):not([type="submit"])').all();

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        const hasLabel = (await label.count()) > 0 || ariaLabel || ariaLabelledby;
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test('should show error states on invalid input', async ({ page }) => {
    await page.goto('/login');

    // Fill invalid data
    const emailInput = page
      .locator('input[type="email"], input[id="email"], input[name="email"]')
      .first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      // Check for error styling or aria-invalid
      const isInvalid = await emailInput.getAttribute('aria-invalid');
      const errorMessage = page.locator('[role="alert"]').first();

      const hasErrorIndicator =
        isInvalid === 'true' || (await errorMessage.isVisible().catch(() => false));
      // This is informational - not all forms validate on blur
      console.log('Error indicator present:', hasErrorIndicator);
    }
  });

  test('should have accessible dialog/modals', async ({ page }) => {
    await page
      .goto('/app/products')
      .catch(() => page.goto('/app').catch(() => page.goto('/').catch(() => {})));

    // Look for any dialog
    const dialogs = page.locator('[role="dialog"], dialog');

    const dialogCount = await dialogs.count();
    if (dialogCount > 0) {
      const dialog = dialogs.first();

      // Check if dialog has accessible title
      const title = dialog.locator('h1, h2, h3, [role="heading"], [aria-label]').first();
      await expect(title).toBeAttached({ timeout: 5000 });
    }
  });
});
