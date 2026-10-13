#!/usr/bin/env node
// Mutation summary for CI (specs/testing.md §9, NFR-T7): reads the StrykerJS JSON reports under web/reports/mutation
// and prints a score table plus the surviving mutants. The workflow appends it to the job summary; it never fails
// the run, because mutation testing is non-blocking by design.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The aim from testing.md §9; below it the table says so, but nothing fails. */
const AIM = 80;

/** Scores one Stryker mutation-testing-elements report: detected = Killed + Timeout; Ignored/CompileError are not counted. */
export function scoreStryker(report) {
  let detected = 0;
  let total = 0;
  const survivors = [];
  for (const [file, f] of Object.entries(report.files)) {
    for (const m of f.mutants) {
      if (m.status === "Killed" || m.status === "Timeout") {
        detected++;
        total++;
      } else if (m.status === "Survived" || m.status === "NoCoverage") {
        total++;
        survivors.push({
          file,
          line: m.location.start.line,
          mutator: m.mutatorName,
          replacement: m.replacement,
        });
      }
    }
  }
  return {
    detected,
    total,
    score: total === 0 ? 100 : (detected / total) * 100,
    survivors,
  };
}

/** Renders `{ suite: score }` as a Markdown table followed by a list of surviving mutants per suite. */
export function toMarkdown(bySuite) {
  const rows = Object.entries(bySuite).map(
    ([name, s]) =>
      `| ${name} | ${s.score.toFixed(2)}% (${s.detected}/${s.total}) | ${s.score < AIM ? "below aim" : "ok"} |`,
  );
  const lists = Object.entries(bySuite)
    .filter(([, s]) => s.survivors.length > 0)
    .map(
      ([name, s]) =>
        `<details><summary>${name}: ${s.survivors.length} surviving</summary>\n\n${s.survivors
          .map(
            (m) =>
              `- \`${m.file}:${m.line}\` ${m.mutator} → \`${String(m.replacement).slice(0, 60)}\``,
          )
          .join("\n")}\n\n</details>`,
    );
  return [
    "| Suite | Mutation score | Aim ≥ 80% |",
    "|---|---|---|",
    ...rows,
    "",
    ...lists,
  ].join("\n");
}

// CLI: scan web/reports/mutation/<suite>.json.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(
    fileURLToPath(new URL("..", import.meta.url)),
    "web",
    "reports",
    "mutation",
  );
  const bySuite = {};
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      if (name.endsWith(".json"))
        bySuite[name.replace(/\.json$/, "")] = scoreStryker(
          JSON.parse(readFileSync(join(dir, name), "utf8")),
        );
    }
  }
  const md = `### Mutation testing (non-blocking)\n\n${toMarkdown(bySuite)}\n`;
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
