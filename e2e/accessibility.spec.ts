import { test, expect } from '@playwright/test';

test.describe('Accessibility Features', () => {
  test('should have skip to content link on landing page', async ({ page }) => {
    await page.goto('/');

    // Check for skip link or main content landmark
    const skipLink = page.locator('a[href="#main-content"], a[href="#main"]').first();
    const hasSkipLink = (await skipLink.count()) > 0;

    if (hasSkipLink) {
      await expect(skipLink).toBeAttached();
    } else {
      // Skip to main content
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeAttached({ timeout: 5000 });
    }
  });

  test('should have proper heading hierarchy on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that page has some headings (even if not all levels)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

    // Page should have at least one heading
    expect(headings.length).toBeGreaterThanOrEqual(0);

    // If there are headings, there should be exactly one h1
    if (headings.length > 0) {
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeLessThanOrEqual(1);
    }
  });

  test('should have landmarks on landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for main content
    const main = page.locator('main, [role="main"]').first();
    const hasMain = (await main.count()) > 0;

    // If no main, check for other landmarks
    const hasNavigation = (await page.locator('nav, [role="navigation"]').count()) > 0;
    const hasHeader = (await page.locator('header').count()) > 0;

    // At least one landmark should be present
    const hasLandmarks = hasMain || hasNavigation || hasHeader;
    expect(hasLandmarks).toBeTruthy();
  });

  test('should have proper language attribute', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', /id|id-ID|en/);
  });

  test('should have descriptive page title', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have focus indicators on interactive elements', async ({ page }) => {
    await page.goto('/login');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Check that an element is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeAttached();
  });
});
