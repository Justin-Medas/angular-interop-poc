import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

test.describe('E2E-10 FR10 invalid config.json', () => {
  test('E2E-10 FR10 an invalid config shows the config error screen and no app', async ({
    page,
  }) => {
    await page.route('**/config.json', (route) =>
      route.fulfill({ json: { environment: 'prod', auth: { enabled: true } } }),
    );
    await page.goto('/apps/blotter');
    await expect(page.getByRole('heading', { level: 1, name: 'Configuration error' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('/environment');
    await expect(page.getByRole('heading', { level: 1, name: 'Blotter' })).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test('E2E-10 FR10 a missing config.json shows the error screen with the HTTP status', async ({
    page,
  }) => {
    await page.route('**/config.json', (route) => route.fulfill({ status: 404, body: 'nope' }));
    await page.goto('/apps/detail');
    await expect(page.getByRole('alert')).toContainText('HTTP 404');
  });
});

test.describe('E2E-11 FR11 theme toggle', () => {
  test('E2E-11 FR11 starts dark, toggles at runtime and survives a reload', async ({ page }) => {
    await page.goto('/dev/ui-gallery');
    const html = page.locator('html');
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await expect(html).toHaveAttribute('data-theme', 'dark');
    const dark = await background();

    await page.getByRole('button', { name: 'Switch to light theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    expect(await background()).not.toBe(dark);
    await expectNoA11yViolations(page);

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible();
  });

  test('E2E-11 FR11 the toggle works from the keyboard', async ({ page }) => {
    await page.goto('/dev/ui-gallery');
    await page.getByRole('button', { name: 'Switch to light theme' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});
