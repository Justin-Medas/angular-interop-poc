# Angular Interop POC — FDC3 + Go + Agentic Workspace Planning

A two-day interview POC. It shows an Angular shell with two FDC3-connected micro-apps, a contract-first Go API, and an LLM agent that plans which UI modules to load (with one read-only tool and an optional FDC3 broadcast). A pass-rate eval backs those plans. It is built test-first, accessible (WCAG 2.2 AA) and themed entirely from design tokens.

**Specs are the source of truth.** Read `specs/` before writing code. If a spec and the code disagree, the code is wrong unless the user approves a spec change. Change the spec first, then the code.

## Read first
- `specs/SPEC.md` covers goals, non-goals and acceptance criteria.
- `specs/openapi.yaml` is the HTTP contract for the Go API.
- `specs/fdc3-contract.md` lists the contexts, intents, channels and app IDs.
- `specs/agent-tool-schema.json` is the structured output the agent must return (a WorkspacePlan).
- `specs/mock-data.yaml` is the deterministic mock universe behind the API, the agent, the evals and the visual tests.
- `specs/appd.json` is the FDC3 app directory the API serves to Sail.
- `specs/runtime-config.schema.json` validates `/config.json`.
- `specs/evals/cases.yaml` holds the eval scenarios and the pass threshold.
- `specs/testing.md` is the test strategy: TDD, coverage, E2E, visual, evals and the CI pipeline.
- `specs/design-tokens.md` defines token tiers, the palette, themes and the AG Grid mapping.
- `specs/accessibility.md` defines the WCAG 2.2 AA rules and checks.
- `docs/PLAN.md` is the two-day plan and current status. Update its checkboxes as work lands.
- `docs/DECISIONS.md` has the decision log. Add an entry when you make a non-obvious call.

## Repo layout (target)
```
specs/                 contracts (written before code)
api/                   Go module: HTTP server, mock data, agent endpoint, evals
  cmd/server/          main
  internal/quotes/     quotes + watchlist handlers (mock data)
  internal/agent/      workspace-plan endpoint (Claude + tool loop + semantic checks + deterministic fallback)
  evals/               eval runner (live / replay / fallback) reading specs/evals/cases.yaml
web/                   Angular workspace: ONE application (shell) + libraries (DECISIONS #10)
  projects/shell/      the application; renders agent plans; serves /apps/blotter and /apps/detail for Sail
  projects/blotter/    library: ticker blotter (broadcasts fdc3.instrument, row menu raises ViewChart)
  projects/detail/     library: instrument detail (listens; handles ViewChart; quote + chart tabs)
  projects/ui/         library: design tokens + our own components + AG Grid wrapper (the swappable seam)
  projects/interop/    library: InteropService interface + FDC3 adapter + in-memory adapter
  e2e/                 Playwright E2E, accessibility scans and visual tests (specs/testing.md)
scripts/               cross-platform Node scripts (setup, check-env, check-coverage)
docs/                  plan, decisions, architecture diagram, demo notes
```

## Verified stack (checked 2026-10-06; re-verify before installing)
| Piece | Version | Notes |
|---|---|---|
| Node | 26.10 (Homebrew) | Satisfies Angular 22's `>=26` engine range |
| Angular | 22.2.x | Requires Node `^22.22.3 \|\| ^24.15.0 \|\| >=26` |
| AG Grid Community | 36.2.x (`ag-grid-angular`, `ag-grid-community`) | MIT, peer `@angular/core >= 20`. Community features only (DECISIONS #7) |
| @finos/fdc3 | 2.2.3 | API + `getAgent()` only, no Desktop Agent included |
| FDC3 Sail | v2 (browser), pinned SHA in `scripts/setup-sail.mjs`, installed to `.sail/` | Runs on :8090, Electron removed, "not production ready". Itself uses `@finos/fdc3@2.2.3` |
| Go | 1.27.1 (Homebrew) | anthropic-sdk-go needs ≥ 1.24 |
| anthropic-sdk-go | v1.78.x | Model from `AGENT_MODEL`: `claude-sonnet-5-5` (default) or `claude-opus-5-5` (DECISIONS #20) |

## Architecture rules
- **Interop is behind an interface.** Components inject an `InteropService` token and never call `window.fdc3` directly. Provide two adapters: `Fdc3InteropService` (real, uses `getAgent()`) and `InMemoryInteropService` (BroadcastChannel, for tests and the no-Sail fallback). OpenFin would be a third adapter. **Never claim OpenFin was run.** Say it is a config swap behind this seam.
- **Components get the design system through wrappers.** Feature code imports from `projects/ui` (`<poc-data-table>`, `<poc-button>`), never from `ag-grid-*` directly. Everything except the grid is our own token-styled component. This seam is a talking point, so keep it clean.
- **One build, many environments.** Apps read `/config.json` (validated against `specs/runtime-config.schema.json`) through the `RUNTIME_CONFIG` token. No `environment.ts` switching. The `auth` block is a reserved seam with `enabled: false`, so don't implement login.
- **The agent returns data, not UI.** The Go endpoint returns a WorkspacePlan that validates against `specs/agent-tool-schema.json` and passes the semantic checks in SPEC §7.3. The shell maps each `module` to a lazy-loaded component. The agent's only side effect is an opt-in `fdc3Action` broadcast. On any failure in FR7, the deterministic fallback (SPEC §7.4) runs and the response sets `"source": "fallback"`.
- **Styling comes only from tokens.** Components use semantic tokens (`var(--poc-color-…)`), never primitives or raw colors (`specs/design-tokens.md`). Stylelint and a contrast test enforce it.
- **Accessible by default.** WCAG 2.2 AA (`specs/accessibility.md`): keyboard-complete flows, visible focus, color never the only signal, axe-clean E2E states.

## Angular conventions (expect to explain these in the interview)
- Standalone components only. No NgModules.
- Signals for component state (`signal`, `computed`, `input()`, `output()`). Use `toSignal()` at the edge when consuming Observables. RxJS is only for streams such as FDC3 listeners and HTTP.
- `inject()` for dependency injection, not constructor parameters. Use `InjectionToken`s for swappable services (interop, design system).
- Set `ChangeDetectionStrategy.OnPush` on every component. Use the new control flow (`@if`, `@for` with `track`).
- Lazy-load micro-apps with `loadComponent` in routes.
- Keep code small and readable. Prefer clarity over cleverness, because the author has to walk through it live.

## Go conventions
- Standard library `net/http` with the 1.22+ pattern routing. No framework unless it earns its place.
- Handlers must match `openapi.yaml`. Contract tests in `api/internal/.../*_contract_test.go` load the OpenAPI file and validate real responses against it.
- Claude call (SPEC §7.2): model from `AGENT_MODEL` (default `claude-sonnet-5-5`, opt-in `claude-opus-5-5`; same request shape for both), **structured outputs** (`output_config.format` with `specs/agent-tool-schema.json`), one `strict: true` read-only tool (`get_watchlist_quotes`) with `tool_choice: auto`, at most 3 tool calls. **Forced `tool_choice` (`any` or `tool`) returns a 400 on both models.** Omit `thinking` (neither model accepts disabling it) and set `output_config.effort: "low"` explicitly. Read `ANTHROPIC_API_KEY` and `AGENT_MODEL` from env (locally via the gitignored repo-root `.env`) and never commit the key. Tests and dev eval runs use the default model; Opus is opt-in.
- Every agent response is validated against the schema and the SPEC §7.3 semantic checks before it is returned.
- Env vars and mock-data determinism are in SPEC §6.3. Tests always run with the defaults.

## Commands (fill in as they become real; planned ones are marked)
```bash
# Go API
cd api && go test ./... && go run ./cmd/server         # :8080
cd api && go run ./evals -cases ../specs/evals/cases.yaml -mode replay   # planned: live | replay | fallback

# Angular
cd web && npm ci && npx ng serve shell                 # :4200
cd web && npx ng test

# Planned (specs/testing.md)
npm run test:e2e            # Playwright functional + axe
npm run test:visual         # visual snapshots inside the pinned Playwright container
npm run test:visual:update  # refresh baselines (same container), commit separately
node scripts/check-coverage.mjs   # Go 100% statement coverage gate

# Setup + FDC3 Sail (pinned commit, installed into .sail/)
npm run setup        # check toolchain, install git hooks, fetch + build Sail
npm run sail         # :8090
npm run check-env
```

## Git workflow (mandatory)
- `main` gets one bootstrap commit. After that, everything lands through `<type>/<slug>` branches (`feat/`, `fix/`, `chore/`, `docs/`, `test/`) and squash-merged PRs.
- **TDD (specs/testing.md §2).** Write the failing test first. A failing `test(<scope>): <FR> failing test …` commit may precede its implementation, but **the pushed head must always be green**. Commit at every green test run with Conventional Commits (`feat(api): …`). Push the branch often.
- Open PRs with `gh pr create`. The body lists the FR IDs and spec files covered, plus test output.
- **Never merge without the user's explicit approval in chat.** Never push to or force-push `main`. The `pre-push` hook blocks it.
- The history is context for future agents. Read `git log` and closed PRs before re-deciding something.

## Reproducibility (mandatory)
- A fresh clone must work on macOS, Linux and Windows through `docker compose up`, a Dev Container or Codespace, or `npm run setup && npm start`.
- Scripts are Node `.mjs`, not bash. Pin every version. Never rely on a globally installed tool beyond Node, Go, git and Docker.
- Any PR that touches setup must keep the `fresh-clone` workflow green on all three OSes.

## Scope guard
In scope: the specs, Go API, shell, blotter, detail, one intent (`ViewChart`), agent endpoint with one read-only tool, ~26 evals, the CI test pipeline (unit, E2E, visual, accessibility, evals), README with diagram, demo recording.
**Cut:** auth, real market data, mobile, OpenFin runtime, persistence beyond in-memory, a mix of UI libraries. Under time pressure, cut in the order listed in `docs/PLAN.md`.
If a task drifts into a cut item, stop and flag it. Don't build it.

## AI tooling layers
| Layer | What | Where |
|---|---|---|
| Process | AI-DLC 2.10 (`/aidlc`), phase-gated with human approval at each gate | `.claude/` (aidlc-* files), `aidlc/spaces/default/` |
| Project rules for AI-DLC | Specs-first, forbidden/mandated rules, stack, decisions | `aidlc/spaces/default/memory/project.md` |
| Framework | Official Angular skills `angular-developer`, `angular-new-app` | `.claude/skills/angular-*` (pinned in `skills-lock.json`) |
| Design system | Wrapper rule, tokens, trading-UI conventions | `.claude/skills/poc-design-system` |
| Tools | Angular CLI MCP server (build/test/serve, docs search, best practices) | `.mcp.json` |
| Spec workflow | `/implement-spec`, `/spec-check`, `/run-evals`, `/explain`, `spec-reviewer` agent | `.claude/skills/`, `.claude/agents/` |

AI-DLC owns `.claude/settings.json` and `.claude/CLAUDE.md`. Don't hand-edit them, because `aidlc config` refreshes them. Project-specific permissions live in `.claude/settings.local.json`.

## Workflow
0. Run `/aidlc-practices-discovery` once to record TDD, the coverage target and WCAG 2.2 AA in `team.md` (the `poc` scope skips that stage, and its default is test-after). Then run AI-DLC with the `poc` scope: `/aidlc poc Build the Angular interop POC described in specs/SPEC.md`. As soon as the workflow exists, run `/aidlc --test-strategy comprehensive`. The setting is per workflow, so it can't be set in advance, and the `poc` default plans unit tests only (`team.md` § Testing Posture). At the Requirements Analysis gate, check that it references `specs/` rather than restating it.
1. Before implementing an area, run `/implement-spec <area>`. It reads the relevant specs and writes failing tests from them first.
2. After implementing, run `/spec-check` (or the `spec-reviewer` agent) to catch drift.
3. Run `/explain <file>` on anything you'd be asked to walk through in the interview.
4. Update `docs/PLAN.md` checkboxes at the end of each block.
