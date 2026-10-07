# Practices Discovery — Questions

Suggested answers come from the lead draft (`team-practices.md`), the three reviews in `contributions/`, and `org.md` defaults. Brownfield-early: only items the evidence could not settle are asked.

## Q1 — Way of Working: branch lifetime and merge habit
The draft says "branches live hours, not days". The developer review suggests "within a day". PR #1 was a merge commit, and merged branches were never deleted.

A. Branches merge within a day. Squash every PR, delete the branch on merge, and run `gh pr checks` right before `gh pr merge`, treating pending or cancelled checks as not green. (Recommended)
B. Same as A, but keep "hours, not days".
C. Same as A, but without the `gh pr checks` habit.
X. Other (please specify)

[Answer]: A

## Q2 — Walking Skeleton: build a thin end-to-end slice first?
A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in. The Go tier is done. The remaining slice is the Angular shell, one lazy micro-app and an in-memory broadcast between two tabs, checked end to end.

A. Yes. The first unit of the remaining work is that slice, and I approve it before later units start. (Recommended)
B. No. Build the units in plan order without a checkpoint.
X. Other (please specify)

[Answer]: A

## Q3 — Testing: how visible must the failing-test step be?
DECISIONS #14 asks for a "visible red step", but PRs #5 and #6 have no failing-test commits.

A. At least one failing `test(...)` commit in every PR that adds behavior. (Recommended)
B. A failing-test commit for every behavior.
C. Optional. Write tests first, with no separate commit required.
X. Other (please specify)

[Answer]: A

## Q4 — Testing: how many tests should the workflow plan?
The `poc` scope defaults to the minimal test plan (unit tests only), which falls short of 100% coverage plus E2E, visual and accessibility tests.

A. Comprehensive: unit, E2E, visual and accessibility, matching specs/testing.md. (Recommended)
B. Standard.
C. Keep minimal and rely on specs/testing.md by hand.
X. Other (please specify)

[Answer]: A

## Q5 — Deployment: what does "release" mean here?
`org.md` says "deploy on merge to staging", but this project runs locally only.

A. A merge to `main` is the release. The `fresh-clone` CI on three operating systems is the smoke check, and a rollback is a revert PR. This specialises the org default rather than contradicting it. (Recommended)
X. Other (please specify)

[Answer]: A

## Q6 — Code Style: formatting for TypeScript, HTML and SCSS
There is no Prettier config yet. Go uses `gofmt` and `go vet`.

A. Commit a Prettier config and run `prettier --check` in the CI `lint` job. Go stays on `gofmt` and `go vet`. (Recommended)
B. Same as A, plus a pinned `staticcheck` for Go.
C. Use only the Angular CLI and editor defaults, with no formatter check in CI.
X. Other (please specify)

[Answer]: A

## Q7 — Code Style: what else should the team style cover? (select all that apply)
A. Layer boundaries and error handling: each Go concern in its own `internal/` package with `Register(mux, deps)`, errors through `httpx.WriteError`, Angular libraries importing only each other's public APIs, and errors shown visibly. (Recommended)
B. Cheap security checks in the blocking `lint` job: `govulncheck`, a pinned gitleaks history scan, and an ESLint ban on `[innerHTML]` and `bypassSecurityTrust*`, because agent text is untrusted. (Recommended)
C. API-key handling for the future live-eval job: the key only in step-level env, never `pull_request_target`, actions pinned by SHA in that job, and no keys or headers in recordings. (Recommended)
X. Other (please specify)

[Answer]: A, B, C

## Q8 — Hard rules to add to project.md (select all that apply)
A. ALWAYS keep the pushed head of every branch green; a failing `test(...)` commit is allowed only below a green head.
B. NEVER add a line-level coverage-ignore comment; exclusions are whole files listed in specs/testing.md §4 with a DECISIONS entry.
C. NEVER lower a coverage threshold, add a coverage exclusion, or add a CI retry without a DECISIONS entry.
D. NEVER let a feature library import another feature library, or reach into a library's internals instead of its public API.
E. NEVER use primitive tokens or raw color values in component styles.
F. NEVER render agent or other untrusted text with `[innerHTML]` or `bypassSecurityTrust*`.
X. Other (please specify)

[Answer]: A, B, C, D, E, F
