// Visual snapshots (specs/testing.md §6, NFR-T1): the app screens in the dark theme, and the UI gallery in both
// themes plus forced colors. Serves FR1, FR3, FR10, FR11, FR12, NFR-DS4, NFR-A5.
// The set stays small on purpose; the three plan screens (movers, two modules, fallback badge) join it with FR8/FR14.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

/** Waits for every web font and running transition so a snapshot never captures a half-painted frame. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    while (document.getAnimations().length > 0) {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    }
  });
}

/** Opens Blotter and Detail in one context so the in-memory BroadcastChannel connects them (as in E2E-2). */
async function openPair(context: BrowserContext) {
  const blotter = await context.newPage();
  const detail = await context.newPage();
  await blotter.goto('/apps/blotter');
  await detail.goto('/apps/detail');
  await expect(blotter.getByRole('row', { name: /AAPL/ })).toBeVisible();
  // BroadcastChannel does not buffer: wait until Detail listens before selecting.
  await expect(detail.getByText('Select an instrument in the blotter.')).toBeVisible();
  return { blotter, detail };
}

test.describe('NFR-T1 app screens (dark theme)', () => {
  test('FR1 blotter', async ({ page }) => {
    await page.goto('/apps/blotter');
    await expect(page.getByRole('row', { name: /GS/ })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('blotter.png');
  });

  test('FR3 detail quote tab', async ({ context }) => {
    const { blotter, detail } = await openPair(context);
    await blotter.getByRole('row', { name: /AAPL/ }).getByRole('gridcell').first().click();
    await expect(detail.getByRole('heading', { level: 2, name: /AAPL/ })).toBeVisible();
    await settle(detail);
    await expect(detail).toHaveScreenshot('detail-quote.png');
  });

  test('FR12 detail chart tab, 1D', async ({ context }) => {
    const { blotter, detail } = await openPair(context);
    await blotter.getByRole('row', { name: /AAPL/ }).getByRole('gridcell').first().click();
    await detail.getByRole('tab', { name: /chart/i }).click();
    await expect(detail.getByRole('img', { name: /AAPL/ })).toBeVisible();
    await settle(detail);
    await expect(detail).toHaveScreenshot('detail-chart-1d.png');
  });

  test('FR10 config error screen', async ({ page }) => {
    await page.route('**/config.json', (route) =>
      route.fulfill({ json: { environment: 'prod', auth: { enabled: true } } }),
    );
    await page.goto('/apps/blotter');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Configuration error' }),
    ).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('config-error.png');
  });
});

test.describe('NFR-DS4 UI gallery', () => {
  test('dark theme', async ({ page }) => {
    await page.goto('/dev/ui-gallery');
    const region = page.getByRole('region', { name: 'dark theme' });
    await expect(region).toBeVisible();
    await settle(page);
    await expect(region).toHaveScreenshot('gallery-dark.png');
  });

  test('light theme', async ({ page }) => {
    await page.goto('/dev/ui-gallery');
    const region = page.getByRole('region', { name: 'light theme' });
    await expect(region).toBeVisible();
    await settle(page);
    await expect(region).toHaveScreenshot('gallery-light.png');
  });

  test('NFR-A5 forced colors', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/dev/ui-gallery');
    await expect(page.getByRole('region', { name: 'dark theme' })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot('gallery-forced-colors.png', { fullPage: true });
  });
});
