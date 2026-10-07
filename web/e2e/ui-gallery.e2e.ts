import { expect, test } from '@playwright/test';
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
