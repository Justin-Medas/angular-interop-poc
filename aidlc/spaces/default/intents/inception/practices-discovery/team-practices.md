# Team Practices

## Way of Working

- We work trunk-based. `main` is the only long-lived branch. Construction worktrees use base `main` and merge target `main`.
- Every change goes on a short-lived `<type>/<short-slug>` branch (a Bolt or Unit uses its slug), and branches merge within a day.
- Every branch lands through a PR that a human approves. We squash every PR, so each Bolt becomes one commit on `main`, and we delete the branch on merge.
- We can't rely on branch protection, so right before `gh pr merge` we run `gh pr checks <n>`. A pending or cancelled check counts as not green.
- We commit small and often with Conventional Commit messages, and push the branch as we go. The PR's commit list shows the red-green story; `main` gets one clean commit per PR.
- The one real secret (`ANTHROPIC_API_KEY`, used only by the live-eval CI job) is handled like this:
  - it goes only in that step's `env`, never in workflow- or job-level env;
  - that workflow never uses a `pull_request_target` trigger;
  - every action in that job is pinned by commit SHA;
  - eval recordings, reports and artifacts never contain the key or request headers.
- Project specifics (PR body contents, the `pre-push` guard, cross-platform scripts, quickstarts) live in `project.md`.

## Walking Skeleton

- Yes. We build a thin end-to-end slice first and prove the pieces connect before the real features go in.
- The first Unit of the remaining work is the slice defined in `project.md` § Walking Skeleton. Its verification command must exercise the real end-to-end path, and a human approves it before later Units start.

## Testing Posture

- **Methodology**: tdd
- **Ordering**: For each behavior, write the smallest test that names its spec ID, run it and watch it fail for the expected reason, write the least code that makes it pass, then refactor with the suite green.
- Every PR that adds behavior shows its red step: at least one failing `test(<scope>): <ID> failing test …` commit comes before the implementation, and it sits below a green pushed head.
- Scaffolding with no behavior (generated workspaces, config) has no red step; its commit message says so.
- Workflows on this project plan the comprehensive test strategy: unit, contract, E2E, visual and accessibility tests, as `specs/testing.md` defines them. The `poc` scope's minimal default does not apply.
- Coverage floors, test layers and tooling come from `project.md` § Testing Posture and `specs/testing.md`. We never weaken a floor or gate to make a step pass.
- Tests assert observable output (rendered roles and text, HTTP bodies, broadcasts, plans), not internal wiring.
- The existing suite stays green on every push.

## Deployment

- This work has no hosted environment, so a merge to `main` is the release. This specialises the org's deploy-on-merge default for a local-only project; it does not contradict it.
- The `fresh-clone` CI run on macOS, Linux and Windows is our smoke check that `main` works from a clean clone through the documented quickstarts.
- Rollback means a PR that reverts the squash commit on `main`. We never force-push `main`.

## Code Style

- We defer to the formatter and linters configured in the repo. CI runs them in the blocking `lint` job, so a failure blocks the PR.
- TypeScript, HTML and SCSS: a committed Prettier config, checked in CI with `prettier --check`, alongside ESLint (angular-eslint, including template accessibility rules and import boundaries) and Stylelint (token-only styling). These land with `web/`.
- Go: `gofmt` and `go vet`.
- Cheap security checks also run in `lint`:
  - `govulncheck`;
  - a gitleaks scan of the full history, pinned to a version and run without a global install;
  - an ESLint ban on `[innerHTML]` and `bypassSecurityTrust*`, because agent text is untrusted.
- Layer boundaries:
  - Each Go concern is its own package under `api/internal/` and exposes `Register(mux, deps)`.
  - `cmd/server` only does wiring.
  - Angular feature libraries import other libraries only through their public APIs, and micro-apps talk only through `InteropService`.
- Error handling:
  - Go setup errors fail fast.
  - Every HTTP error goes through `httpx.WriteError` with an OpenAPI `Error.code`.
  - Angular turns HTTP and interop failures into visible state; nothing is swallowed silently.
- Naming is language-idiomatic. Test names carry their spec ID (`specs/testing.md` § 10). Framework conventions are in `project.md` § Code Style.
