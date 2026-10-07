**Collaborator:** aidlc-devsecops-agent

## Contribution

Review of the lead draft (`team-practices.md`, `discovered-rules.md`, `evidence.md`) through a lint, SAST, secrets and supply-chain lens. The scale is a two-day, local-only interview POC with no deployment target. Each item below is marked **Cheap, do it**, **Optional** or **Overkill, skip**.

### Verified security baseline (add to `evidence.md`)

| Evidence | Finding |
|---|---|
| `git log --all -p` grep for `sk-ant-…` and `ANTHROPIC_API_KEY=<value>` | No hits. `git ls-files` shows no tracked `.env*` or key files |
| `.gitignore` | Ignores `.env` and `.env.*`, which also covers `.env.local` and the like |
| `api/internal/config/config.go`, `api/cmd/server/main.go` | The key is read from the environment only. `main.go` logs just the port, and no code path logs `Config` |
| `.devcontainer/devcontainer.json` | Declares `ANTHROPIC_API_KEY` as an optional Codespaces secret, so no value is stored in the repo |
| `specs/SPEC.md` NFR-S1, `specs/testing.md` §7 | In CI the key is a repo secret, used only by the `live` eval job. Every other job runs keyless (fallback and replay) |
| `.github/workflows/ci.yml` | Sets `permissions: contents: read` at workflow level, which is good |
| `.github/workflows/fresh-clone.yml` | **Has no `permissions:` block**, so it inherits the repo default token scope |
| Action refs | Pinned by major tag, not SHA. The tags are mixed: `@v4`/`@v5` in `ci.yml` and `@v7` in `fresh-clone.yml` |
| `api/go.sum` | Present. The Go module graph is checksum-verified through sum.golang.org |
| `scripts/setup-sail.mjs` | Sail is fetched by an exact commit SHA, then installed with `npm ci` (Sail's own lockfile). Sail's npm lifecycle scripts run at install time. That is an accepted risk, bounded by the SHA and lockfile pins |
| `.mcp.json` | `npx -y @angular/cli@22` floats within the 22.x major, so each run can execute a newer patch from npm |
| `.claude/settings.local.json` | Gitignored and machine-local. It denies reading `./.env` but not `./.env.*`. Its push deny patterns can be bypassed by syntax (e.g. `HEAD:main`). The `.githooks/pre-push` hook is the real guard, but `--no-verify` bypasses it, and branch protection is not available on GitHub Free for private repos (DECISIONS #6) |
| Scanners | No secret scanning, dependency scanning or SAST beyond `go vet` exists yet. gitleaks, govulncheck and trufflehog are not installed locally |

### Suggested additions to `team-practices.md` § Code Style

Suggested wording to append:

> - Security-relevant static checks run in the same blocking `lint` job as formatting. Go: `go vet`, plus `govulncheck ./...` run through `go run golang.org/x/vuln/cmd/govulncheck@<pinned>` (no global install). Repo: a secret scan over the full history with a pinned gitleaks version run through `go run` (no global install), with `--redact`.
> - Model output is untrusted input. Templates render agent text (plan rationale, echoed prompts) only through interpolation. ESLint bans `bypassSecurityTrust*` and `[innerHTML]` bindings in feature code.

- **govulncheck: Cheap, do it.** It is one CI step and reachability-based, so it is low-noise. It needs no global tool, which keeps the NFR-R / "Node, Go, git, Docker only" rule intact.
- **Pinned gitleaks in CI: Cheap, do it.** It turns "NEVER commit ANTHROPIC_API_KEY" from a promise into a check. Use `fetch-depth: 0` on that checkout.
- **ESLint ban on `bypassSecurityTrust*` and `[innerHTML]`: Cheap, do it.** Add it when ESLint lands with `web/`. Agent output is LLM text, so this is the main XSS seam in the app.
- **Prettier (open question 6):** this has no security bearing. Use whatever the Angular 22 scaffold ships, and if Prettier is chosen, run `prettier --check` in `lint`.
- **`npm audit` for `web/`: Optional, non-blocking.** On a dev-heavy Angular tree it mostly reports dev-only transitive advisories. If added, use `--omit=dev --audit-level=high` and keep it informational.
- **Full SAST suite (CodeQL, Semgrep, SonarQube), DAST, SBOM, Dependabot version-update PRs: Overkill, skip.** They add CI minutes, triage and PR noise that work against a two-day pinned-stack story. Dependabot *alerts* can be switched on in repo settings with no repo change, if the human wants them.

### Suggested additions to `team-practices.md` § Way of Working (CI and supply chain)

> - Every workflow declares least-privilege `permissions:` at the top (`contents: read` unless a job needs more).
> - Third-party inputs are pinned: lockfiles with `npm ci`, `go.sum`, the Go `toolchain` directive, Sail by commit SHA, and tools run through `go run …@<version>` / `npx <pkg>@<exact version>`. A bump is its own PR with a reason.
> - The `ANTHROPIC_API_KEY` secret is scoped to the single `live` eval step (step-level `env`), never to a whole workflow, and never to a `pull_request_target` trigger.

- **Add `permissions: contents: read` to `fresh-clone.yml`: Cheap, do it.** It is a two-line fix.
- **Unify action majors and use `go-version-file: api/go.mod` in `fresh-clone.yml`: Cheap, do it.** This removes drift between the workflows (also listed as lead Q8).
- **SHA-pin actions:** do it **only in the job that receives the API key** (the future `live` eval job). That is the one place where a hijacked tag could exfiltrate a secret. Tag pins are fine in the keyless, `contents: read` jobs. Pinning every action by SHA is optional.
- **Pin `.mcp.json` to an exact `@angular/cli` version** (or switch to the local devDependency through `npx ng mcp` once `web/` exists): **Cheap, do it.** It matches the "every toolchain is pinned" rule in `project.md`.
- **`npm ci --ignore-scripts` for Sail: Skip.** It would likely break Sail's native build. The SHA plus lockfile pin is the proportionate control, and DECISIONS should record it as an accepted risk the next time `setup-sail.mjs` changes.
- **Local pre-commit secret hook: Optional.** A short `.githooks/pre-commit` that calls a Node script to reject staged `.env*` files and `sk-ant-` strings is cross-platform and cheap. The CI gitleaks scan is the required layer. The hook only gives earlier feedback.
- **Agent deny list:** add `Read(./.env.*)` and `Read(./**/.env.*)` to `.claude/settings.local.json`. This is a local-only, one-minute fix. It is not a team rule, because the file is not committed.

### Candidate rules for `discovered-rules.md`

Each candidate needs the human's confirmation in the interview. Both trace to SPEC NFR-S1 and `specs/testing.md` §7. Neither duplicates the existing "NEVER commit ANTHROPIC_API_KEY or any .env file" rule in `project.md`.

```
NEVER write ANTHROPIC_API_KEY or any request header into logs, eval recordings (api/evals/recordings/), eval reports or CI artifacts; recordings store model response bodies only
NEVER expose a repository secret to a whole workflow, to a pull_request_target trigger, or to a job whose third-party actions are not pinned by commit SHA
```

The first rule is enforceable by a unit test that fails if any file under `api/evals/recordings/` contains `x-api-key` or `sk-ant-`. That test is cheap, and it belongs in the PR that adds `-record`.

### Note on open question 8

The lead framed Q8 as "CI hygiene, not a practice choice". The action-pinning and scanner items are hygiene. How the one real secret flows through CI is a team practice, though, so it is drafted above as Way of Working wording and rule candidates.

## Positions

- AGREE: Code Style defers to the repo's configured formatter and linter, and a failing `lint` job blocks the PR. That is the right enforcement point for the cheap security checks too.
- AGREE: Both candidate rules in `discovered-rules.md` (green pushed head; no line-level coverage-ignore comments). `scripts/check-coverage.mjs` already enforces the second.
- AGREE: Deployment is framed as merge-to-`main` with the `fresh-clone` matrix as the smoke check. With no hosted target, there is no runtime attack surface to harden beyond local defaults.
- OBJECT: Code Style lists only formatting and linting. It should name `govulncheck`, a pinned secret scan, and the ESLint ban on `bypassSecurityTrust*`/`[innerHTML]` as part of the blocking `lint` job. Each costs one CI step or one lint rule, and together they make NFR-S1 and the untrusted-LLM-output boundary checkable rather than declared.
- OBJECT: Q8 treats secret flow as hygiene outside practice. The `ANTHROPIC_API_KEY` scoping (step-level env, never `pull_request_target`, SHA-pinned actions in that job, no key or headers in recordings) should be affirmed as Way of Working text and rule lines, because the live-eval job is the only place the repo handles a real secret.
