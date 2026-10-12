#!/usr/bin/env node
// `npm run test:visual` / `npm run test:visual:update` (specs/testing.md §6, NFR-T1): runs the Playwright visual
// suite inside the pinned Playwright Linux image, so baselines are identical on macOS, Windows and Linux.
// CI does not use this script; its `visual` job runs the same suite as a container job (ci.yml).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * The Playwright image tag for the npm package version. Playwright requires the browser build to match the npm
 * package, so the version in web/package.json is the single source of truth (ci.yml is checked against it in a test).
 */
export function imageFor(playwrightVersion) {
  return `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
}

/** The exact Playwright version pinned in web/package.json. */
export function pinnedPlaywrightVersion() {
  const pkg = JSON.parse(readFileSync(join(root, 'web', 'package.json'), 'utf8'));
  return pkg.devDependencies['@playwright/test'];
}

/**
 * `docker run` arguments. The platform is fixed to linux/amd64 because CI runners are x86-64 and anti-aliasing
 * differs by CPU architecture; a named volume keeps Linux node_modules apart from the host's native ones.
 */
export function dockerArgs({ image, repo, update }) {
  const playwright = ['npx', 'playwright', 'test', '-c', 'playwright.visual.config.ts'];
  if (update) playwright.push('--update-snapshots');
  return [
    'run', '--rm', '--ipc=host', '--platform', 'linux/amd64',
    '-v', `${repo}:/work`,
    '-v', 'poc-visual-node-modules:/work/web/node_modules',
    '-w', '/work/web',
    '-e', 'VISUAL_API_BIN=/work/api/bin/server-visual',
    image,
    'sh', '-c', `npm ci --no-audit --no-fund && ${playwright.join(' ')}`,
  ];
}

/** Runs a command, exiting with its status on failure. */
function run(cmd, args, options = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const update = process.argv.includes('--update');
  // The image has no Go toolchain, so build the API for linux/amd64 on the host (Go is a documented prerequisite).
  run('go', ['build', '-o', join('bin', 'server-visual'), './cmd/server'], {
    cwd: join(root, 'api'),
    env: { ...process.env, GOOS: 'linux', GOARCH: 'amd64', CGO_ENABLED: '0' },
  });
  run('docker', dockerArgs({ image: imageFor(pinnedPlaywrightVersion()), repo: root, update }));
  if (update) {
    console.log('\nBaselines refreshed. Commit them on their own: test(visual): update baselines — <reason>');
  }
}
