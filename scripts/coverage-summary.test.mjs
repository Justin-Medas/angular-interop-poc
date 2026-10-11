// Tests for coverage-summary.mjs (NFR-T2): the Markdown table CI shows on every run's summary page.
// Run: node --test scripts/coverage-summary.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, toMarkdown } from './coverage-summary.mjs';

// Istanbul's coverage-final.json: s = statement hit counts, f = function hit counts, b = branch hit arrays.
const file = { s: { 0: 1, 1: 0 }, f: { 0: 1 }, b: { 0: [1, 0] } };

test('NFR-T2 summarize counts covered and total statements, branches and functions', () => {
  assert.deepEqual(summarize({ 'a.ts': file }), {
    statements: { covered: 1, total: 2 },
    branches: { covered: 1, total: 2 },
    functions: { covered: 1, total: 1 },
  });
});

test('NFR-T2 summarize adds up several files', () => {
  const s = summarize({ 'a.ts': file, 'b.ts': file });
  assert.equal(s.statements.total, 4);
  assert.equal(s.statements.covered, 2);
});

test('NFR-T2 toMarkdown renders one row per project with percentages', () => {
  const md = toMarkdown({ ui: summarize({ 'a.ts': file }) });
  assert.match(md, /\| Project \| Statements \| Branches \| Functions \|/);
  assert.match(md, /\| ui \| 50\.00% \(1\/2\) \| 50\.00% \(1\/2\) \| 100\.00% \(1\/1\) \|/);
});

test('NFR-T2 an empty project shows 100% rather than dividing by zero', () => {
  assert.match(toMarkdown({ x: summarize({}) }), /\| x \| 100\.00% \(0\/0\)/);
});
