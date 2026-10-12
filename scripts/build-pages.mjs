#!/usr/bin/env node
// Builds the GitHub Pages report site into ./site (NFR-T2, NFR-T3): the Go coverage HTML, each Angular project's
// coverage HTML, and the Playwright report, behind one landing page with the coverage numbers. Runs in
// .github/workflows/pages.yml after the tests have produced their reports; a missing report is simply not linked.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize } from './coverage-summary.mjs';

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pct = ({ covered, total }) => `${(total === 0 ? 100 : (covered / total) * 100).toFixed(2)}% (${covered}/${total})`;
const LABELS = { go: 'Go API coverage', e2e: 'Playwright E2E report' };

/**
 * Landing page HTML. `reports` are the site-relative folders that exist (each has an index.html),
 * `byProject` the Angular coverage summaries. All values are escaped: this page is published.
 */
export function renderIndex({ reports, byProject, commit }) {
  const links = reports
    .map((r) => `<li><a href="${escape(r)}/index.html">${escape(LABELS[r] ?? `Angular coverage: ${r.replace('web/', '')}`)}</a></li>`)
    .join('\n      ');
  const rows = Object.entries(byProject)
    .map(([name, s]) => `<tr><td>${escape(name)}</td><td>${pct(s.statements)}</td><td>${pct(s.branches)}</td><td>${pct(s.functions)}</td></tr>`)
    .join('\n        ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Angular Interop POC reports</title>
  <style>
    :root { color-scheme: light dark; }
    body { font: 16px/1.5 system-ui, sans-serif; margin: 0 auto; max-width: 52rem; padding: 1rem; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid currentColor; padding: 0.25rem 0.5rem; text-align: start; }
  </style>
</head>
<body>
  <main>
    <h1>Angular Interop POC: test reports</h1>
    <p>Built from commit <code>${escape(commit)}</code> on main.</p>
    <h2>Reports</h2>
    <ul>
      ${links}
    </ul>
    <h2>Angular unit-test coverage</h2>
    <table>
      <thead><tr><th scope="col">Project</th><th scope="col">Statements</th><th scope="col">Branches</th><th scope="col">Functions</th></tr></thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </main>
</body>
</html>
`;
}

// CLI: copy whatever reports exist into ./site and write the landing page.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const site = join(root, 'site');
  const reports = [];
  const byProject = {};
  const publish = (from, to) => {
    if (!existsSync(join(from, 'index.html'))) return;
    cpSync(from, join(site, to), { recursive: true });
    reports.push(to);
  };
  mkdirSync(site, { recursive: true });
  publish(join(root, 'api', 'coverage'), 'go');
  const webCov = join(root, 'web', 'coverage');
  if (existsSync(webCov)) {
    for (const name of readdirSync(webCov).sort()) {
      const json = join(webCov, name, 'coverage-final.json');
      if (existsSync(json)) byProject[name] = summarize(JSON.parse(readFileSync(json, 'utf8')));
      publish(join(webCov, name), `web/${name}`);
    }
  }
  publish(join(root, 'web', 'playwright-report'), 'e2e');
  const commit = (process.env.GITHUB_SHA ?? 'local').slice(0, 7);
  writeFileSync(join(site, 'index.html'), renderIndex({ reports, byProject, commit }));
  console.log(`site/ built with ${reports.length} reports`);
}
