#!/usr/bin/env node
// Installs FINOS FDC3 Sail (the browser Desktop Agent) at a pinned commit into .sail/fdc3-sail.
// Cross-platform: plain Node + git, no bash. Safe to re-run; skips work that's already done.
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Bump deliberately, and record why in docs/DECISIONS.md.
const SAIL_REPO = 'https://github.com/finos/FDC3-Sail.git';
const SAIL_SHA = '550b2d48662c170fdf27bb3beab1fb7cdb5225fb'; // main @ 2026-10-01, uses @finos/fdc3 2.2.3

const dir = join(process.cwd(), '.sail', 'fdc3-sail');
const isWindows = process.platform === 'win32';

function run(cmd, args, cwd = dir) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) {
    console.error(`\n✗ Failed: ${cmd} ${args.join(' ')} (in ${cwd})`);
    process.exit(result.status ?? 1);
  }
}

function currentSha() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

if (currentSha() !== SAIL_SHA) {
  console.log(`→ Fetching FDC3 Sail @ ${SAIL_SHA.slice(0, 7)}`);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, '.git'))) {
    run('git', ['init', '--quiet']);
    run('git', ['remote', 'add', 'origin', SAIL_REPO]);
  }
  run('git', ['fetch', '--depth', '1', '--quiet', 'origin', SAIL_SHA]);
  run('git', ['checkout', '--quiet', '--force', 'FETCH_HEAD']);
} else {
  console.log(`✓ FDC3 Sail already at ${SAIL_SHA.slice(0, 7)}`);
}

if (!existsSync(join(dir, 'packages', 'web', 'dist'))) {
  console.log('→ Installing and building FDC3 Sail (first run takes a minute or two)');
  run('npm', ['ci', '--no-audit', '--no-fund']);
  run('npm', ['run', 'build']);
} else {
  console.log('✓ FDC3 Sail already built');
}

console.log('✓ FDC3 Sail ready. Start it with: npm run sail  (http://localhost:8090)');
