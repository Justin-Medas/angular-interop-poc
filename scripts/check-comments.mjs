#!/usr/bin/env node
// File-header gate (specs/code-documentation.md, NFR-C1/C4/C5): every tracked source file of a
// covered type must start with a comment saying what it is. ESLint (jsdoc) and revive cover
// exported symbols; this covers the file types they cannot see (SCSS, CSS, YAML, Dockerfile,
// hooks) and gives TypeScript, .mjs and Go one uniform header rule. Cross-platform Node, no deps.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

// Comment openers that count as a header, per file family.
const SLASH = ['//', '/*'];
const HASH = ['#'];
const OPENERS = { ts: SLASH, mjs: SLASH, go: SLASH, scss: SLASH, css: SLASH, yml: HASH, yaml: HASH };

// Tests are named by spec ID instead (testing.md §10); generated and vendored paths are not ours.
const EXEMPT = [/\.spec\.ts$/, /_test\.go$/, /\.e2e\.ts$/, /\.test\.mjs$/, /\.d\.ts$/];
const SKIPPED_DIRS = /(^|\/)(node_modules|dist|coverage|\.angular|\.sail|aidlc|\.claude|specs|docs|test-results|playwright-report)\//;

/** Which header openers apply to this path, or null when the file type is not covered. */
function openersFor(path) {
  const name = basename(path);
  if (/^Dockerfile$|\.Dockerfile$/.test(name) || path.startsWith('.githooks/')) return HASH;
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return OPENERS[ext] ?? null;
}

/** True when the repo-relative path (forward slashes) must carry a header comment. */
export function isChecked(path) {
  if (SKIPPED_DIRS.test(path) || EXEMPT.some((re) => re.test(path))) return false;
  return openersFor(path) !== null;
}

/** Returns a message when the file lacks a leading comment, otherwise null. */
export function headerProblem(path, text) {
  const openers = openersFor(path);
  const lines = text.split(/\r?\n/);
  // A shebang must stay on line 1, so the header is the first comment after it.
  const first = lines.find((l, i) => l.trim() !== '' && !(i === 0 && l.startsWith('#!')));
  if (first !== undefined && openers.some((o) => first.trimStart().startsWith(o))) return null;
  return `${path}: missing header comment (what this file is, why it exists, spec IDs)`;
}

// CLI: check every tracked file of a covered type.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const problems = tracked
    .filter(isChecked)
    .map((f) => headerProblem(f, readFileSync(f, 'utf8')))
    .filter(Boolean);
  problems.forEach((p) => console.error(`✗ ${p}`));
  if (problems.length) process.exit(1);
  console.log('✓ every covered source file has a header comment');
}
