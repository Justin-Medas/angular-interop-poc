#!/usr/bin/env node
// Verifies the toolchain for the native quickstart. Cross-platform (macOS, Linux, Windows).
// Required: Node (version range from package.json devEngines), Go >= 1.24, git.
// Optional: Docker (docker compose quickstart), gh (PR workflow), ANTHROPIC_API_KEY (agent; fallback works without it).
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const isWindows = process.platform === 'win32';
let ok = true;

function probe(cmd, args = ['--version']) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: isWindows });
  return r.status === 0 ? (r.stdout || r.stderr).trim().split('\n')[0] : null;
}

function report(required, name, version, hint) {
  if (version) console.log(`✓ ${name}: ${version}`);
  else {
    console.log(`${required ? '✗' : '·'} ${name} missing${hint ? ` — ${hint}` : ''}`);
    if (required) ok = false;
  }
}

// Node: compare against the range Angular requires (mirrored in package.json devEngines).
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk = (major === 22 && minor >= 22) || (major === 24 && minor >= 15) || major >= 26;
report(true, 'node', nodeOk ? `v${process.versions.node}` : null,
  `found v${process.versions.node}; need ^22.22 || ^24.15 || >=26 (see .nvmrc)`);

const goVersion = probe('go', ['version']);
const goMinor = Number(goVersion?.match(/go1\.(\d+)/)?.[1] ?? 0);
report(true, 'go', goMinor >= 24 ? goVersion : null,
  goVersion ? `found ${goVersion}; need >= 1.24` : 'install Go >= 1.24 from https://go.dev/dl/');

report(true, 'git', probe('git'), 'install git');
report(false, 'docker', probe('docker'), 'only needed for the `docker compose up` quickstart');
report(false, 'gh', probe('gh'), 'only needed for the PR workflow');
report(false, 'ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY ? 'set' : null,
  'agent endpoint will use its deterministic fallback');

const sailPinned = readFileSync(new URL('./setup-sail.mjs', import.meta.url), 'utf8')
  .match(/SAIL_SHA = '([0-9a-f]{7})/)?.[1];
report(false, `FDC3 Sail @ ${sailPinned}`, existsSync('.sail/fdc3-sail/packages/web/dist') ? 'installed' : null,
  'run `npm run setup`');

console.log(ok ? '\nToolchain OK' : '\nToolchain incomplete');
process.exit(ok ? 0 : 1);
