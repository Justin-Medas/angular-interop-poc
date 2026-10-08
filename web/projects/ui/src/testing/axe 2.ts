import axe from 'axe-core';

/** specs/accessibility.md §3 for unit tests: serious or critical axe violations in rendered markup. jsdom has no layout, so color-contrast is covered by the token test instead. */
export async function a11yViolations(root: HTMLElement): Promise<string[]> {
  document.body.appendChild(root);
  try {
    const { violations } = await axe.run(root, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
      rules: { 'color-contrast': { enabled: false } },
    });
    return violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.help}`);
  } finally {
    root.remove();
  }
}
