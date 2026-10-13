// Tests for mutation-summary.mjs (NFR-T7): the non-blocking mutation score and survivor list in the job summary.
// Run: node --test scripts/mutation-summary.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreStryker, toMarkdown } from "./mutation-summary.mjs";

const mutant = (status, line = 1) => ({
  status,
  mutatorName: "ConditionalExpression",
  replacement: "true",
  location: { start: { line } },
});
const report = {
  files: {
    "projects/a.ts": {
      mutants: [
        mutant("Killed"),
        mutant("Timeout"),
        mutant("Survived", 7),
        mutant("NoCoverage", 9),
        mutant("Ignored"),
      ],
    },
  },
};

test("NFR-T7 scoreStryker counts killed and timed-out mutants as detected, ignoring ignored ones", () => {
  const s = scoreStryker(report);
  assert.equal(s.detected, 2);
  assert.equal(s.total, 4);
  assert.equal(s.score, 50);
});

test("NFR-T7 scoreStryker lists survivors and uncovered mutants with file and line", () => {
  const s = scoreStryker(report);
  assert.deepEqual(
    s.survivors.map((m) => `${m.file}:${m.line}`),
    ["projects/a.ts:7", "projects/a.ts:9"],
  );
});

test("NFR-T7 an empty report scores 100 rather than dividing by zero", () => {
  assert.equal(scoreStryker({ files: {} }).score, 100);
});

test("NFR-T7 toMarkdown shows one row per suite and flags scores below the 80 aim", () => {
  const md = toMarkdown({ interop: scoreStryker(report) });
  assert.match(md, /\| interop \| 50\.00% \(2\/4\) \| below aim \|/);
  assert.match(md, /projects\/a\.ts:7/);
});
