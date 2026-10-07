import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

test.describe('E2E-0 /dev/ui-gallery', () => {
  test('NFR-A2 NFR-DS4 renders both themes and is axe-clean, including color contrast', async ({
    page,
  }) => {
    await page.goto('/dev/ui-gallery');
    await expect(page.getByRole('heading', { level: 1, name: 'UI Gallery' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'dark theme' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'light theme' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('NFR-A3 tabs switch with the arrow keys', async ({ page }) => {
    await page.goto('/dev/ui-gallery');
    const dark = page.getByRole('region', { name: 'dark theme' });
    await dark.getByRole('tab', { name: 'Quote' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(dark.getByRole('tab', { name: 'Chart' })).toHaveAttribute('aria-selected', 'true');
    await expect(dark.getByRole('tabpanel')).toContainText('Chart panel');
  });
});

test.describe('E2E-0 NFR-A5 NFR-DS6 reduced motion on /dev/ui-gallery', () => {
  const durations = (page: Page, selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);

  const targets = {
    button: '[data-theme="dark"] poc-button button',
    tab: '[data-theme="dark"] [role="tab"]',
  };

  for (const [name, selector] of Object.entries(targets)) {
    test(`NFR-A5 ${name} transitions run normally with no preference`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto('/dev/ui-gallery');
      expect(await durations(page, selector)).toContain('0.12s');
    });

    test(`NFR-A5 ${name} transitions are 0s under prefers-reduced-motion`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/dev/ui-gallery');
      const value = await durations(page, selector);
      expect(
        value.split(',').every((d) => d.trim() === '0s'),
        value,
      ).toBe(true);
    });
  }

  test('NFR-A5 grid rows animate normally with no preference', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/dev/ui-gallery');
    await expect(page.locator('[data-theme="dark"] .ag-row-animation').first()).toBeAttached();
  });

  test('NFR-A5 grid rows do not animate under prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dev/ui-gallery');
    await expect(page.locator('[data-theme="dark"] .ag-row').first()).toBeAttached();
    await expect(page.locator('.ag-row-animation')).toHaveCount(0);
  });
});
