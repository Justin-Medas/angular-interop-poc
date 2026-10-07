#!/usr/bin/env node
// Go coverage gate (specs/testing.md §4): runs go tests with coverage, fails below 100% statements,
// and fails if any line-level coverage-ignore comment exists in source. Cross-platform.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const api = join(root, 'api');
const run = (args) => spawnSync('go', args, { cwd: api, encoding: 'utf8' });

// Every package is tested and measured except the whole-file exclusions in testing.md §4.
const excluded = ['./cmd/server'];
const mod = run(['list', '-m']).stdout.trim();
const pkgs = run(['list', './...']).stdout.trim().split(/\r?\n/).map((p) => '.' + p.slice(mod.length));
const measured = pkgs.filter((p) => !excluded.includes(p));

const profile = join(mkdtempSync(join(tmpdir(), 'cov-')), 'cover.out');
const test = run(['test', '-covermode=atomic', `-coverprofile=${profile}`, `-coverpkg=${measured.join(',')}`, ...measured]);
process.stdout.write(test.stdout);
if (test.status !== 0) { process.stderr.write(test.stderr); process.exit(1); }

const total = run(['tool', 'cover', `-func=${profile}`]).stdout.trim().split('\n').pop();
const pct = parseFloat(total.split(/\s+/).pop());
let ok = pct === 100;
if (!ok) console.error(`✗ Go statement coverage ${pct}% < 100%`);

// Only our source trees are scanned; .claude/ and aidlc/ hold framework code we don't own.
const sourceDirs = ['api', 'web', 'scripts'];
const ignore = /(istanbul|c8|v8) ignore/;
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.angular', 'dist', 'coverage'].includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(go|ts|mjs|js)$/.test(e.name) && p !== self && ignore.test(readFileSync(p, 'utf8'))) {
      console.error(`✗ coverage-ignore comment in ${p}`);
      ok = false;
    }
  }
}
for (const d of sourceDirs) if (existsSync(join(root, d))) walk(join(root, d));

console.log(ok ? `✓ Go coverage ${pct}%, no ignore comments` : '');
process.exit(ok ? 0 : 1);
