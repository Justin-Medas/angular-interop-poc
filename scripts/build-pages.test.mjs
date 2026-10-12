// Tests for build-pages.mjs (NFR-T2, NFR-T3): the landing page of the GitHub Pages report site.
// Run: node --test scripts/build-pages.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderIndex } from './build-pages.mjs';

const summary = { statements: { covered: 1, total: 2 }, branches: { covered: 0, total: 0 }, functions: { covered: 1, total: 1 } };

test('NFR-T2 the index links every report that exists and omits the ones that do not', () => {
  const html = renderIndex({ reports: ['go', 'web/ui', 'e2e'], byProject: { ui: summary }, commit: 'abc1234' });
  for (const href of ['go/index.html', 'web/ui/index.html', 'e2e/index.html']) assert.ok(html.includes(`href="${href}"`), href);
  assert.ok(!renderIndex({ reports: ['go'], byProject: {}, commit: 'abc1234' }).includes('e2e/index.html'));
});

test('NFR-T2 the index shows per-project coverage percentages and the commit', () => {
  const html = renderIndex({ reports: [], byProject: { ui: summary }, commit: 'abc1234' });
  assert.match(html, /<td>ui<\/td>/);
  assert.match(html, /50\.00% \(1\/2\)/);
  assert.match(html, /abc1234/);
});

test('NFR-A1 the index is a valid accessible page: lang, title, one h1, a table with headers', () => {
  const html = renderIndex({ reports: [], byProject: { ui: summary }, commit: 'x' });
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.equal((html.match(/<h1>/g) ?? []).length, 1);
  assert.match(html, /<th scope="col">Project<\/th>/);
});

test('NFR-S5 values are HTML-escaped', () => {
  const html = renderIndex({ reports: [], byProject: { '<b>x</b>': summary }, commit: '"><script>' });
  assert.ok(!html.includes('<script>') && !html.includes('<b>x'));
});
