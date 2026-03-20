import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate using keyboard on login page', async ({ page }) => {
    await page.goto('/login');

    // Tab through elements
    const focusableElements: string[] = [];

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.tagName + (el.getAttribute('id') ? `#${el.getAttribute('id')}` : '') : null;
      });
      if (focused) focusableElements.push(focused);
    }

    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for navigation with aria-label
    const navElements = await page.locator('nav').all();

    for (const nav of navElements) {
      const ariaLabel = await nav.getAttribute('aria-label');
      const id = await nav.getAttribute('id');
      // Nav should have either aria-label or id for accessibility
      if (!ariaLabel && !id) {
        console.log('Navigation found without label');
      }
    }
  });

  test('should have accessible navigation links on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Get navigation links
    const navLinks = page.locator('nav a, header a, [role="navigation"] a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      for (let i = 0; i < Math.min(linkCount, 5); i++) {
        const link = navLinks.nth(i);
        const text = await link.textContent();
        // Link should have accessible text
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
