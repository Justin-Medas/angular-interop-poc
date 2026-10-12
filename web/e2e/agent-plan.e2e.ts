// E2E-6 to E2E-9 (specs/testing.md §5): command bar and plan renderer. E2E-6 hits the real API (no key, so the
// fallback answers); E2E-7 to E2E-9 stub POST /agent/select-module with fixtures. Serves FR6, FR7, FR8, FR14, FR17.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expectNoA11yViolations } from './a11y';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures', 'plans', `${name}.json`), 'utf8');

/** Answers the next agent request with a fixture. */
async function stubPlan(page: Page, name: string) {
  await page.route('**/agent/select-module', (route) =>
    route.fulfill({ contentType: 'application/json', body: fixture(name) }),
  );
}

async function ask(page: Page, prompt: string) {
  await page
    .getByRole('searchbox', { name: 'Ask the workspace' })
    .or(page.getByLabel('Ask the workspace'))
    .fill(prompt);
  await page.keyboard.press('Enter');
}

test.describe('E2E-6 FR6 FR7 FR14 command bar against the real API', () => {
  test('E2E-6 FR14 a trading request gets the fallback plan and the fallback badge', async ({
    page,
  }) => {
    await page.goto('/');
    await ask(page, 'buy 100 AAPL');
    await expect(page.getByRole('heading', { level: 2, name: 'Out of scope' })).toBeVisible();
    await expect(page.getByText('Trading is out of scope for this demo.')).toBeVisible();
    const meta = page.getByTestId('plan-meta');
    await expect(meta).toContainText('fallback');
    await expect(meta).toContainText('no_api_key');
    await expect(meta).toContainText('Tool calls: 0');
    await expectNoA11yViolations(page);
  });
});

test.describe('E2E-7 FR8 stubbed two-module plan', () => {
  test('E2E-7 FR8 renders modules in order, announces the rationale and focuses the first heading', async ({
    page,
  }) => {
    await stubPlan(page, 'two-nones-with-broadcast');
    await page.goto('/');
    await ask(page, 'show two cards');
    const headings = page.getByRole('heading', { level: 2, name: 'Out of scope' });
    await expect(headings).toHaveCount(2);
    await expect(headings.first()).toBeFocused();
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      'Showing two cards and syncing TSLA.',
    );
    const text = await page.locator('[data-module]').allTextContents();
    expect(text[0]).toContain('First card reason.');
    expect(text[1]).toContain('Second card reason.');
    await expect(page.getByTestId('plan-meta')).toContainText('model');
    await expect(page.getByTestId('plan-meta')).toContainText('Tool calls: 1');
    await expectNoA11yViolations(page);
  });
});

test.describe('E2E-8 FR17 fdc3Action', () => {
  test('E2E-8 FR17 a plan with fdc3Action updates Detail in a second page', async ({ context }) => {
    const shell = await context.newPage();
    const detail = await context.newPage();
    await stubPlan(shell, 'two-nones-with-broadcast');
    await detail.goto('/apps/detail');
    await expect(detail.getByText('Select an instrument in the blotter.')).toBeVisible();
    await shell.goto('/');
    await ask(shell, 'sync TSLA to my other windows');
    await expect(detail.getByRole('heading', { level: 2, name: /TSLA/ })).toBeVisible();
    await expectNoA11yViolations(detail);
  });
});

test.describe('E2E-9 FR8 unknown module', () => {
  test('E2E-9 FR8 an unknown module shows the error card', async ({ page }) => {
    await stubPlan(page, 'unknown-module');
    await page.goto('/');
    await ask(page, 'show a hologram');
    await expect(page.getByRole('alert')).toContainText('Unknown module “hologram”');
    await expectNoA11yViolations(page);
  });
});
