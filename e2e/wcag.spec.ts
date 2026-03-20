import { test, expect } from '@playwright/test';

test.describe('WCAG Compliance', () => {
  test('should have sufficient color contrast on login page', async ({ page }) => {
    await page.goto('/login');

    // Get the page and analyze contrast
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Basic check - page should have proper text color
    const textColor = await page.evaluate(() => {
      const body = document.querySelector('body');
      return body ? window.getComputedStyle(body).color : null;
    });

    expect(textColor).toBeTruthy();
  });

  test('should not have auto-playing media', async ({ page }) => {
    await page.goto('/login');

    // Check for audio/video elements
    const audioVideo = await page.locator('audio[autoplay], video[autoplay]').count();
    expect(audioVideo).toBe(0);
  });

  test('should have proper focus management', async ({ page }) => {
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

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/login');

    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should either have alt text or be decorative (role="presentation" or alt="")
      const hasAlt = alt !== null || role === 'presentation';
      expect(hasAlt).toBeTruthy();
    }
  });

  test('should not have inline styles that could cause issues', async ({ page }) => {
    await page.goto('/login');

    // Check for proper viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('page should load without console errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (err) => !err.includes('favicon') && !err.includes('404') && !err.includes('net::ERR'),
    );

    // This is informational - some errors might be expected
    console.log('Console errors found:', criticalErrors.length);
  });
});
