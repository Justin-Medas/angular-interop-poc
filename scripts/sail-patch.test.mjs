// Tests for sail-patch.mjs: Sail's default app directories must include the POC's AppD so a fresh clone
// shows Blotter and Detail without a manual settings step (docs/DECISIONS.md #42).
// Run: node --test scripts/sail-patch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POC_DIRECTORY_URL, withPocDirectory } from './sail-patch.mjs';

// The slice of Sail's LocalStorageClientState.ts at the pinned SHA that the patch targets.
const upstream = `const DEFAULT_DIRECTORIES: Directory[] = [
  {
    label: "FINOS FDC3 Directory",
    url: "https://directory.fdc3.finos.org/v2/apps/",
    active: true,
  },
]
`;

test('FR2 the POC directory is added as an active default', () => {
  const out = withPocDirectory(upstream);
  assert.ok(out.includes(`url: "${POC_DIRECTORY_URL}"`));
  assert.match(out, /label: "POC Blotter and Detail",\s+url: "http:\/\/localhost:8080\/appd\/v2\/apps",\s+active: true/);
});

test('FR2 the upstream directories are kept', () => {
  assert.ok(withPocDirectory(upstream).includes('https://directory.fdc3.finos.org/v2/apps/'));
});

test('FR2 patching twice changes nothing more (setup is safe to re-run)', () => {
  const once = withPocDirectory(upstream);
  assert.equal(withPocDirectory(once), once);
});

test('FR2 an unrecognised upstream file fails loudly instead of silently skipping the patch', () => {
  assert.throws(() => withPocDirectory('export const x = 1'), /DEFAULT_DIRECTORIES/);
});

test('FR2 a CRLF checkout (Windows autocrlf) is patched and keeps its CRLF endings', () => {
  const out = withPocDirectory(upstream.replace(/\n/g, '\r\n'));
  assert.ok(out.includes(`url: "${POC_DIRECTORY_URL}"`));
  assert.ok(!/[^\r]\n/.test(out), 'every line ending stays CRLF');
});
