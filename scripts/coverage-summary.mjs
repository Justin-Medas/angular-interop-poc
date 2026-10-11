#!/usr/bin/env node
// Coverage summary for CI (specs/testing.md §4, NFR-T2): reads each Angular project's Istanbul
// coverage-final.json under web/coverage and prints a Markdown table. In GitHub Actions the table is also
// appended to the job summary, so reviewers see coverage on the run page without downloading anything.
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Adds up statement, branch and function hit counts across the files of one coverage-final.json. */
export function summarize(files) {
  const sum = { statements: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 }, functions: { covered: 0, total: 0 } };
  const add = (bucket, hits) => {
    sum[bucket].total += hits.length;
    sum[bucket].covered += hits.filter((h) => h > 0).length;
  };
  for (const f of Object.values(files)) {
    add('statements', Object.values(f.s));
    add('functions', Object.values(f.f));
    add('branches', Object.values(f.b).flat());
  }
  return sum;
}

const cell = ({ covered, total }) => `${(total === 0 ? 100 : (covered / total) * 100).toFixed(2)}% (${covered}/${total})`;

/** Renders `{ project: summary }` as a Markdown table; an empty project counts as fully covered. */
export function toMarkdown(byProject) {
  const rows = Object.entries(byProject).map(
    ([name, s]) => `| ${name} | ${cell(s.statements)} | ${cell(s.branches)} | ${cell(s.functions)} |`,
  );
  return ['| Project | Statements | Branches | Functions |', '|---|---|---|---|', ...rows].join('\n');
}

// CLI: scan web/coverage/<project>/coverage-final.json.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(fileURLToPath(new URL('..', import.meta.url)), 'web', 'coverage');
  const byProject = {};
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      const json = join(dir, name, 'coverage-final.json');
      if (existsSync(json)) byProject[name] = summarize(JSON.parse(readFileSync(json, 'utf8')));
    }
  }
  const md = `### Angular unit-test coverage\n\n${toMarkdown(byProject)}\n`;
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
