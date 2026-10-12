// Tests for visual.mjs (NFR-T1): the pinned image, the docker arguments, and that CI uses the same image.
// Run: node --test scripts/visual.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dockerArgs, imageFor, pinnedPlaywrightVersion } from './visual.mjs';

test('NFR-T1 imageFor names the Playwright image for the npm version', () => {
  assert.equal(imageFor('1.63.0'), 'mcr.microsoft.com/playwright:v1.63.0-noble');
});

test('NFR-T1 pinnedPlaywrightVersion is an exact version, not a range', () => {
  assert.match(pinnedPlaywrightVersion(), /^\d+\.\d+\.\d+$/);
});

test('NFR-T1 ci.yml runs the visual job in the same image as the local script', () => {
  const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.ok(ci.includes(`image: ${imageFor(pinnedPlaywrightVersion())}`));
});

test('NFR-T1 dockerArgs runs the visual config on linux/amd64 and only updates on request', () => {
  const base = { image: 'img', repo: '/repo' };
  const check = dockerArgs({ ...base, update: false });
  assert.ok(check.includes('linux/amd64'));
  assert.match(check.at(-1), /playwright test -c playwright\.visual\.config\.ts$/);
  assert.match(dockerArgs({ ...base, update: true }).at(-1), /--update-snapshots$/);
});
