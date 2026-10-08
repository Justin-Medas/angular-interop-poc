import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

test.describe('E2E-12 FR14 shell layout', () => {
  test('E2E-12 FR14 / shows the chrome and an empty workspace, and is axe-clean in both themes', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Interop Workspace' })).toBeVisible();
    await expect(
      page.getByRole('banner').getByText(/\b(local|docker|codespaces|ci)\b/),
    ).toBeVisible();
    await expect(page.getByRole('main').getByRole('heading', { name: 'Workspace' })).toBeVisible();
    await expectNoA11yViolations(page);

    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expectNoA11yViolations(page);
  });

  test('E2E-12 FR11 the theme toggle is reachable by keyboard from the page start', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Switch to light theme' })).toBeFocused();
  });
});
