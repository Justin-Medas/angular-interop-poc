# Practices Discovery Evidence

Integrated by `aidlc-pipeline-deploy-agent` on 2026-10-07T14:19:32Z. HEAD is `b6d0c06` on `chore/practices-discovery`.
Project type is brownfield-early: no reverse-engineering artifacts exist yet, so the evidence comes from repo configuration, git and PR history, and three independent reviews. This is the first run, because `memory/team.md` had only empty headings. The active scope `poc` declares `skeleton: on`.

## Sources

### Lead (`aidlc-pipeline-deploy-agent`)

| Source | What it showed |
|---|---|
| `aidlc/spaces/default/memory/org.md`, `project.md`, `phases/inception.md` | The rule bundle. `project.md` already holds the project specifics plus 10 Forbidden and 5 Mandated rules |
| `git log` on `main` and `gh pr list --state all` | A bootstrap commit, then 6 merged PRs (2026-10-06 to 2026-10-07) on `<type>/<slug>` heads. Every commit uses Conventional Commits, and lead times run from minutes to hours |
| `gh pr view 5` / `gh pr view 6` | Neither PR has a `test(...)` red commit |
| `3b3589e` | PR #1 was merged with a merge commit. PRs #2–#6 were squash-merged |
| `git branch -a` | Merged branches were never deleted, locally or on origin |
| `.github/workflows/ci.yml` | `lint` runs gofmt and go vet, `unit-go` runs `check-coverage.mjs`, and the workflow sets `permissions: contents: read` |
| `.github/workflows/fresh-clone.yml` | Runs `npm run setup` on a 3-OS matrix |
| `scripts/check-coverage.mjs`, `.githooks/pre-push`, `.claude/settings.local.json` (deny list) | Enforce the 100% Go gate with no ignore comments, block pushes to `main` and block reading `.env` |
| `package.json`, `.nvmrc`, `api/go.mod`, `.gitattributes`, `.devcontainer/devcontainer.json` | Toolchains are pinned and line endings are LF |
| `specs/testing.md`, `docs/DECISIONS.md` #6 and #14, `docs/PLAN.md` | The human's git and testing decisions, plus the open plan items |

### Quality (`contributions/aidlc-quality-agent.md`)
- **Inspected:** `specs/testing.md`, `specs/accessibility.md`, DECISIONS #14, `ci.yml`, `check-coverage.mjs`, the Go tests, `.claude/scopes/aidlc-poc.md` and `.claude/tools/aidlc-testing-posture.ts`.
- **Inferred:**
  - `Methodology: tdd` parses as plain `tdd`.
  - The `poc` scope (depth Minimal) would plan unit tests only.
  - The red step is not visible in history.
  - "CI green" has no enforcement mechanism without branch protection.
  - Coverage tooling has gaps: the Go scope, the TS coverage denominator, and the reach of the ignore-comment scan.
- **Proposed:** the rule against weakening gates without a DECISIONS entry.

### Developer (`contributions/aidlc-developer-agent.md`)
- **Inspected:** `api/**` (9 source files, 7 test files), SPEC §6.5, `fdc3-contract.md` §2, `testing.md` §10, the `poc-design-system` skill, and DECISIONS #10, #11, #17 and #18.
- **Inferred:** the Go code already follows several habits consistently:
  - one package per concern with `Register(mux, deps)`;
  - injected clocks and env readers;
  - errors returned through `httpx.WriteError`;
  - spec IDs cited in comments;
  - drift tests for embedded spec copies;
  - all 28 test names carry a spec ID.
- **Objected:** Code Style covered tooling only, and "hours, not days" was too tight.
- **Proposed:** the library-boundary and token-only styling rules.

### DevSecOps (`contributions/aidlc-devsecops-agent.md`)
- **Inspected:** git history (searched for keys), `.gitignore`, config and `main.go` (checked for key handling), the devcontainer secret, both workflows, action refs, `go.sum`, `setup-sail.mjs`, `.mcp.json` and the local deny list.
- **Inferred:**
  - No secret has been committed.
  - `fresh-clone.yml` has no `permissions:` block.
  - Action tags are mixed and not pinned by SHA.
  - `.mcp.json` floats on `@angular/cli@22`.
  - There is no secret, dependency or SAST scanning yet.
- **Proposed:**
  - `govulncheck`, a pinned gitleaks scan and an ESLint ban on `[innerHTML]`/`bypassSecurityTrust*`;
  - scoping rules for `ANTHROPIC_API_KEY`.
- **Classed as overkill:** a full SAST suite, DAST, an SBOM and Dependabot update PRs.

### Interview (`practices-discovery-questions.md`)
| Q | Topic | Choice |
|---|---|---|
| Q1 | Branch lifetime and merge habit | **A**: merge within a day, squash every PR, delete the branch on merge, run `gh pr checks` before `gh pr merge` (pending or cancelled = not green) |
| Q2 | Walking skeleton | **A**: yes. The first Unit of the remaining work is the `project.md` slice, and the human approves it before later Units |
| Q3 | Visibility of the red step | **A**: at least one failing `test(...)` commit in every PR that adds behavior |
| Q4 | Test volume | **A**: comprehensive (unit, E2E, visual, accessibility per `specs/testing.md`) |
| Q5 | Release meaning | **A**: merge to `main` is the release, `fresh-clone` on 3 OSes is the smoke check, rollback is a revert PR, and this specialises the org default |
| Q6 | TS/HTML/SCSS formatter | **A**: committed Prettier config plus `prettier --check` in `lint`. Go stays on gofmt and go vet |
| Q7 | Extra Code Style coverage | **A, B, C**: layer boundaries and error handling, cheap blocking security checks, and API-key handling for the live-eval job |
| Q8 | Hard rules for `project.md` | **A–F**: all six candidates. All six are in `discovered-rules.md`, and none duplicates an existing `project.md` rule |

## Assumptions & Open Questions

**Resolved by the interview:**
- How visible the red step must be.
- Squash-only merging and branch deletion.
- The deployment framing.
- The order of the skeleton.
- The TS formatter.
- The scope of Code Style.
- Secret handling in CI.
- All candidate rules.

**Remaining uncertainty and actions for the orchestrator:**
1. **Test strategy setting.** Q4 affirms the comprehensive strategy as a team habit. The intent's own test-strategy setting (`/aidlc --test-strategy comprehensive`) is a workflow setting, not memory, so it still has to be applied when the main workflow starts.
2. **Discarded rule candidates.** The devsecops agent's two secret-handling rule lines were not chosen in Q8. Their content is now affirmed as Way of Working text (Q7 C) and is not promoted as rules.
3. **Optional `staticcheck`.** The human chose Q6 A, so Go linting stays at gofmt plus go vet.
4. **Manual Sail check.** E2E uses the in-memory adapter by design, so the real FDC3 path through Sail is checked by hand before the demo. Record that in the demo notes; it is not a gate.

**Hygiene follow-ups.** These are tasks, not practices, so none of them goes into memory:
- [ ] Align action majors between `ci.yml` (`@v4`/`@v5`) and `fresh-clone.yml` (`@v7`).
- [ ] In `fresh-clone.yml`, use `go-version-file: api/go.mod` instead of the hard-coded `go-version: '1.27.1'`.
- [ ] Add `permissions: contents: read` to `fresh-clone.yml`.
- [ ] Widen `check-coverage.mjs` beyond `./internal/...` to cover everything except `cmd/server`, so `api/evals` is tested and counted, or record an exclusion in DECISIONS.
- [ ] Scope the ignore-comment scan in `check-coverage.mjs` to `api/`, `web/` and `scripts/` instead of the whole repo, which today includes `.claude/` and `aidlc/`.
- [ ] Add a spec ID to `api/internal/httpx/json_test.go` `TestWriteJSON_Encodes`.
- [ ] Make `server.healthz` use `httpx.WriteJSON` instead of hand-encoding JSON.
- [ ] Pin `.mcp.json` to an exact `@angular/cli` version, or use the local devDependency once `web/` exists.
- [ ] When the `web/` scaffold lands, set Vitest `coverage.include` to `projects/**/src/**/*.ts`, add excludes that mirror `testing.md` §4, and run coverage for every project.
- [ ] Add `govulncheck`, the pinned gitleaks scan (`fetch-depth: 0`, `--redact`) and `prettier --check` to the `lint` job. The ESLint `[innerHTML]`/`bypassSecurityTrust*` ban goes in with `web/`.
- [ ] Prune merged branches locally and on origin.
- [ ] Add `docker-compose.yml`, which is still open in `docs/PLAN.md`.
- [ ] Local only: add `Read(./.env.*)` to the deny list in `.claude/settings.local.json`.
