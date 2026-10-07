#!/usr/bin/env node
// `npm start`: runs the Go API (:8080), the Angular shell (:4200) and, if installed, FDC3 Sail (:8090).
// Cross-platform: plain child processes, no bash. Ctrl+C stops all of them.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const isWindows = process.platform === 'win32';

// The gitignored repo-root .env holds ANTHROPIC_API_KEY / AGENT_MODEL (SPEC §6.3).
if (existsSync('.env')) process.loadEnvFile('.env');

const services = [
  { name: 'api', cmd: 'go', args: ['run', './cmd/server'], cwd: 'api' },
  { name: 'web', cmd: 'npx', args: ['ng', 'serve', 'shell'], cwd: 'web' },
];
if (existsSync('.sail/fdc3-sail')) {
  services.push({ name: 'sail', cmd: 'npm', args: ['--prefix', '.sail/fdc3-sail', 'start'], cwd: '.' });
} else {
  console.log('[dev] FDC3 Sail not installed; run `npm run setup`. Interop falls back to the in-memory adapter.');
}

const children = services.map(({ name, cmd, args, cwd }) => {
  const child = spawn(cmd, args, { cwd, shell: isWindows, stdio: ['ignore', 'pipe', 'pipe'] });
  const tag = (chunk) =>
    String(chunk).split('\n').filter(Boolean).forEach((line) => console.log(`[${name}] ${line}`));
  child.stdout.on('data', tag);
  child.stderr.on('data', tag);
  child.on('exit', (code) => {
    console.log(`[${name}] exited with ${code}`);
    stop(code ?? 1);
  });
  return child;
});

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  process.exitCode = code;
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
