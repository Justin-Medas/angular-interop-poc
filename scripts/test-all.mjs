#!/usr/bin/env node
// `npm test`: Go unit tests, then Angular unit tests (single run, no watch). Stops at the first failure.
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const steps = [
  { cmd: 'go', args: ['test', './...'], cwd: 'api' },
  { cmd: 'npx', args: ['ng', 'test', '--no-watch'], cwd: 'web' },
];

for (const { cmd, args, cwd } of steps) {
  console.log(`\n> ${cwd}: ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWindows });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
