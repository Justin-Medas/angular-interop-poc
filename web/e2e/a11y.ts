// Playwright axe helper (accessibility.md §3, NFR-A2).
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// specs/accessibility.md §3: run after every meaningful state. Rules are never disabled globally.
export async function expectNoA11yViolations(page: Page): Promise<void> {
  // A scan taken mid colour transition (e.g. right after the theme toggle) measures blended colours and reports a
  // false contrast failure, so let running transitions finish first.
  await page.evaluate(async () => {
    // Re-render can cancel a transition and start a fresh one, so loop until none are left.
    while (document.getAnimations().length > 0) {
      await Promise.allSettled(document.getAnimations().map((a) => a.finished));
    }
  });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
}
