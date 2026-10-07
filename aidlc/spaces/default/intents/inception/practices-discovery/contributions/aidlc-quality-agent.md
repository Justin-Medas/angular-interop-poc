**Collaborator:** aidlc-quality-agent

## Contribution

Independent quality review of the lead draft (`team-practices.md`, `discovered-rules.md`, `evidence.md`), checked against `specs/testing.md`, `specs/accessibility.md`, `docs/DECISIONS.md` #14, `docs/PLAN.md`, `.github/workflows/ci.yml`, `scripts/check-coverage.mjs`, `api/internal/**/*_test.go`, `.claude/scopes/aidlc-poc.md` and `.claude/tools/aidlc-testing-posture.ts`. The findings are ordered by how much they affect the gate.

### 1. Testing Posture is machine-valid as drafted

- `- **Methodology**: tdd` is one of the structured values that `aidlc-testing-posture.ts` accepts (`tdd | bdd | atdd | test-after | custom`). The drafted `Ordering` contains no "first" or "after implementation" phrasing that would trip the mixed-ordering detector, so Code Generation will resolve it as plain `tdd`. Keep both fields verbatim.

### 2. Gap the interview must resolve: test volume under the `poc` scope

- `.claude/scopes/aidlc-poc.md` declares `depth: Minimal` and no test-strategy override. Test strategy defaults to depth, so Code Generation will plan **Minimal** volume: unit tests only, one per requirement. That conflicts in practice with `project.md` § Testing Posture (100% TS/Go coverage, Playwright E2E with axe, visual tests, evals) and with the E2E-1..E2E-11 list in `specs/testing.md` §5.
- The floors are additive, so this is not a rule contradiction, but it will under-plan every Construction unit. Suggested interview question: "Set this intent's test strategy to Comprehensive (unit, integration/contract, E2E, a11y), or keep Minimal and rely on `specs/testing.md` to add the rest?" Recommended answer: `/aidlc --test-strategy comprehensive` for this intent. This is an intent setting, not `team.md` content.

### 3. Gap the interview must resolve: is the red step required to be visible?

- `docs/DECISIONS.md` #14 says "TDD with a visible red step", and `specs/testing.md` §2 says reviewers see test-before-code in the PR's commit list. The draft, and testing.md's own "may", leave it optional. PRs #5 and #6 contain no `test(...)` commits, so today nothing visible proves TDD happened. For an interview POC, the commit list is the evidence.
- Suggested options:
  - **A.** At least one `test(<scope>): <ID> failing test …` commit before its implementation in every PR that adds behavior. *(Recommended. GitHub keeps PR commit lists after `--delete-branch`, so squash-merging does not lose the evidence.)*
  - **B.** Optional red commits, with the PR body pasting one failing-run excerpt per FR group.
  - **C.** Optional, unverified (the current draft).
- If the human picks A, add this to the draft's Testing Posture: "Every PR that adds behavior shows its red step: at least one `test(…)` failing-test commit precedes the implementation commit."

### 4. "CI green before merge" cannot be enforced by the platform

- There is no branch protection (GitHub Free, private repo, DECISIONS #6), so required status checks don't exist. The gate is a habit. Suggested wording for Way of Working: "Immediately before `gh pr merge`, `gh pr checks <n>` shows every check passing. A pending or cancelled check counts as not green." This matters because `ci.yml` cancels superseded runs, which can leave a cancelled check that looks harmless.

### 5. Coverage tooling gaps to close in the PRs that add the code (no `team.md` change needed)

- **Go scope.** `check-coverage.mjs` runs and measures only `./internal/...`. CI never runs `go test ./...`. The planned `api/evals` runner (`specs/testing.md` §7) sits outside `internal/`, so its tests would neither run in CI nor count toward 100%, and testing.md §4 does not list it as an exclusion. Fix this when evals land: widen the package pattern to everything except `cmd/server`, or add a whole-file exclusion with a DECISIONS entry.
- **TS denominator.** The 100% TS gate only means something if untested files are counted. Current Vitest versions measure only the files that tests load unless `coverage.include` is set. The `web/` scaffold PR should set `coverage.include` to `projects/**/src/**/*.ts`, with excludes that mirror testing.md §4 exactly. It should also run coverage for **every** project (shell, ui, interop, blotter, detail), so a library without a test target cannot drop out silently.
- **Phantom branches.** 100% branch coverage on Angular with the v8 provider can report branches no test can reach (compiled decorators, `??` defaults). Line-level ignores are forbidden, so agree on the remedy now: refactor first; otherwise a whole-file exclusion with a DECISIONS entry. Never lower a threshold.
- **Ignore-comment scan scope.** `check-coverage.mjs` walks the whole repo, including `.claude/`, `aidlc/` and future `.aidlc/worktrees/`. A framework update that ships a `c8 ignore` string in `.claude/tools/*.ts` would fail CI on an unrelated PR. Scoping the walk to `api/`, `web/` and `scripts/` would fix that. Low priority.

### 6. Candidate rule to add to `discovered-rules.md` (project.md)

- `NEVER lower a coverage threshold, add a coverage exclusion, or add a CI retry to make a check pass without a docs/DECISIONS.md entry`
  - **Source:** `specs/testing.md` §4 (an exclusion needs a DECISIONS entry) and §5 (a pass-on-retry is fixed or quarantined), plus `org.md` ("may not be weakened to make a step pass").
- Optional, also project-specific: `NEVER cut TDD, the coverage gate, ubuntu E2E with axe scans, the token contrast test or the deterministic fallback under time pressure`
  - **Source:** the never-cut line in `docs/PLAN.md`. It protects the quality bar when the plan's cut list is applied.

### 7. Smaller notes

- **Skeleton verification command.** `project.md`'s skeleton spans Go, the shell, a micro-app and a broadcast, so the human-approved Construction Verification Command should be the first Playwright E2E. Its `webServer` starts the Go API and the shell, it loads a lazy micro-app, it asserts an `fdc3.instrument` broadcast reaches a second page, and it ends with an axe scan (PLAN line 28). `go test` alone does not exercise `cmd/server/main.go`, which testing.md §4 excludes because "exercised by E2E".
- **Test naming drift.** `api/internal/httpx/json_test.go` `TestWriteJSON_Encodes` carries no spec ID, against `specs/testing.md` §10 and `project.md`. Fix it in the next api PR. All other Go test names comply.
- **Visual baselines need Docker locally.** `npm run test:visual:update` runs the pinned container, and Docker Desktop is still unchecked (PLAN line 13). Until it is installed, baselines can only be produced in CI.
- **No automated Sail path.** E2E uses the in-memory adapter by design (testing.md §5), so the real FDC3 path (`Fdc3InteropService` with Sail) has unit tests with a stubbed agent only. A short manual Sail check before the demo is the pragmatic cover. Record it in demo notes rather than as a gate.

## Positions

- AGREE: `Methodology: tdd` with the drafted red/green/refactor Ordering — matches DECISIONS #14 and parses as plain `tdd` in `aidlc-testing-posture.ts`.
- AGREE: Testing Posture defers floors, layers and tooling to `project.md` and `specs/testing.md` — avoids restating the spec, as `project.md` requires.
- AGREE: "Tests assert observable output, not internal wiring" — this is the real defence behind a 100% gate (testing.md §1, §4).
- AGREE: discovered rule `ALWAYS keep the pushed head of every branch green…` — CI tests the head, so it is checkable per PR.
- AGREE: discovered rule `NEVER add a line-level coverage-ignore comment…` — already mechanically enforced by `scripts/check-coverage.mjs`.
- OBJECT: Red step left optional — DECISIONS #14 says "visible red step" and PRs #5–#6 show none. The human should choose A/B/C in §3 (recommended A).
- OBJECT: No test-volume setting for the intent — `poc` depth Minimal will plan unit-only tests against a 100% + E2E + visual + axe posture. Ask for `--test-strategy comprehensive` (§2).
- OBJECT: "after CI is green" has no mechanism — without branch protection, add the `gh pr checks` pre-merge habit to Way of Working (§4).
- OBJECT: Missing candidate rule against weakening gates (threshold, exclusion, retry) without a DECISIONS entry — add it to `discovered-rules.md` (§6).
