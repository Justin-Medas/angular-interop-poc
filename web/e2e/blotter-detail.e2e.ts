// E2E-1 to E2E-5 (specs/testing.md §5): Blotter and Detail as two pages in one browser context, connected by
// the in-memory BroadcastChannel adapter (fdc3-contract.md §6). Serves FR1, FR2, FR3, FR4, FR12, FR15.
// Selectors are role/name only; every state ends with an axe scan (accessibility.md §3).
import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './a11y';

/** Opens Blotter and Detail side by side in one context so the BroadcastChannel connects them. */
async function openPair(context: import('@playwright/test').BrowserContext) {
  const blotter = await context.newPage();
  const detail = await context.newPage();
  await blotter.goto('/apps/blotter');
  await detail.goto('/apps/detail');
  await expect(blotter.getByRole('row', { name: /AAPL/ })).toBeVisible();
  // BroadcastChannel does not buffer: wait until Detail is listening before anything is sent.
  await expect(detail.getByText('Select an instrument in the blotter.')).toBeVisible();
  return { blotter, detail };
}

const row = (page: Page, ticker: string) => page.getByRole('row', { name: new RegExp(ticker) });

test.describe('E2E-1 FR1 blotter shows the watchlist', () => {
  test('E2E-1 FR1 lists the six mock-data watchlist symbols and is axe-clean', async ({ page }) => {
    await page.goto('/apps/blotter');
    for (const t of ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'JPM', 'GS']) {
      await expect(row(page, t)).toBeVisible();
    }
    await expect(row(page, 'AMZN')).toHaveCount(0);
    await expect(row(page, 'AAPL')).toContainText('228.50');
    await expectNoA11yViolations(page);
  });
});

test.describe('E2E-2 FR2 FR3 selection updates Detail in a second page', () => {
  test('E2E-2 FR2 click on a row shows that instrument in Detail', async ({ context }) => {
    const { blotter, detail } = await openPair(context);
    await expect(detail.getByText('Select an instrument in the blotter.')).toBeVisible();
    await row(blotter, 'MSFT').getByRole('gridcell').first().click();
    await expect(detail.getByRole('heading', { level: 2, name: /MSFT/ })).toBeVisible();
    await expect(detail.getByText('431.20 USD')).toBeVisible();
    await expectNoA11yViolations(detail);
  });

  test('E2E-2 FR2 keyboard Enter on a focused row shows that instrument in Detail', async ({
    context,
  }) => {
    const { blotter, detail } = await openPair(context);
    await row(blotter, 'NVDA').getByRole('gridcell').first().focus();
    await blotter.keyboard.press('Enter');
    await expect(detail.getByRole('heading', { level: 2, name: /NVDA/ })).toBeVisible();
    await expectNoA11yViolations(blotter);
  });
});

test.describe('E2E-3 FR4 FR15 row menu raises ViewChart', () => {
  test('E2E-3 FR15 right-click opens the row menu and View chart opens the chart tab', async ({
    context,
  }) => {
    const { blotter, detail } = await openPair(context);
    await row(blotter, 'TSLA').getByRole('gridcell').first().click({ button: 'right' });
    await expectNoA11yViolations(blotter);
    await blotter.getByRole('menuitem', { name: 'View chart' }).click();
    await expect(detail.getByRole('heading', { level: 2, name: /TSLA/ })).toBeVisible();
    await expect(detail.getByRole('tab', { name: /chart/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expectNoA11yViolations(detail);
  });

  test('E2E-3 FR15 Shift+F10 opens the row menu and raises ViewChart', async ({ context }) => {
    const { blotter, detail } = await openPair(context);
    await row(blotter, 'JPM').getByRole('gridcell').first().focus();
    await blotter.keyboard.press('Shift+F10');
    await expect(blotter.getByRole('menu', { name: 'Row actions' })).toBeVisible();
    await blotter.getByRole('menuitem', { name: 'View chart' }).press('Enter');
    await expect(detail.getByRole('heading', { level: 2, name: /JPM/ })).toBeVisible();
    await expect(detail.getByRole('tab', { name: /chart/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

test.describe('E2E-4 FR3 unknown instrument', () => {
  test('E2E-4 FR3 a broadcast for an unknown ticker shows the unknown-instrument alert', async ({
    context,
  }) => {
    const { detail } = await openPair(context);
    const sender = await context.newPage();
    await sender.goto('/apps/blotter');
    // No UI path can select an unknown ticker, so post the wire message another FDC3 app would send.
    await sender.evaluate(() => {
      const ch = new BroadcastChannel('poc-interop');
      ch.postMessage({ type: 'instrument', ref: { ticker: 'ZZZZ' } });
      ch.close();
    });
    await expect(detail.getByRole('alert')).toHaveText('Unknown instrument ZZZZ');
    await expectNoA11yViolations(detail);
  });
});

test.describe('E2E-5 FR12 chart range switch', () => {
  test('E2E-5 FR12 switching 1D / 5D / 1M refetches history and marks the choice', async ({
    context,
  }) => {
    const { blotter, detail } = await openPair(context);
    await row(blotter, 'AAPL').getByRole('gridcell').first().click();
    await detail.getByRole('tab', { name: /chart/i }).click();
    const group = detail.getByRole('group', { name: 'Range' });
    await expect(group.getByRole('button', { name: '1D', pressed: true })).toBeVisible();
    await expect(detail.getByRole('img', { name: /AAPL/ })).toBeVisible();
    for (const r of ['5D', '1M']) {
      const request = detail.waitForRequest((req) => req.url().includes(`range=${r}`));
      await group.getByRole('button', { name: r }).click();
      await request;
      await expect(group.getByRole('button', { name: r, pressed: true })).toBeVisible();
      await expect(group.getByRole('button', { name: '1D', pressed: false })).toBeVisible();
      await expectNoA11yViolations(detail);
    }
  });
});
