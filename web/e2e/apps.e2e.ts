import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

test.describe('E2E-0 scaffold: /apps/* pages load full-page without shell chrome', () => {
  test('E2E-0 NFR-ARCH1 NFR-A2 /apps/blotter has one main and an h1, and is axe-clean', async ({
    page,
  }) => {
    await page.goto('/apps/blotter');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Blotter' })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test('E2E-0 NFR-ARCH1 NFR-A2 /apps/detail has one main and an h1, and is axe-clean', async ({
    page,
  }) => {
    await page.goto('/apps/detail');
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Instrument Detail' })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expectNoA11yViolations(page);
  });
});
