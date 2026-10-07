# Angular Interop POC — FDC3 + Go + Agentic Module Selection

A two-day interview POC. It shows an Angular shell with two FDC3-connected micro-apps, a contract-first Go API, and an LLM endpoint that chooses which UI module to load. A pass-rate eval backs that choice.

**Specs are the source of truth.** Read `specs/` before writing code. If a spec and the code disagree, the code is wrong unless the user approves a spec change. Change the spec first, then the code.

## Read first
- `specs/SPEC.md` covers goals, non-goals and acceptance criteria.
- `specs/openapi.yaml` is the HTTP contract for the Go API.
- `specs/fdc3-contract.md` lists the contexts, intents, channels and app IDs.
- `specs/agent-tool-schema.json` is the structured output the agent must return.
- `specs/evals/cases.yaml` holds the eval scenarios and the pass threshold.
- `docs/PLAN.md` is the two-day plan and current status. Update its checkboxes as work lands.
- `docs/DECISIONS.md` has the decision log. Add an entry when you make a non-obvious call.

## Repo layout (target)
```
specs/                 contracts (written before code)
api/                   Go module: HTTP server, mock data, agent endpoint, evals
  cmd/server/          main
  internal/quotes/     quotes + watchlist handlers (mock data)
  internal/agent/      module-selection endpoint (Claude + deterministic fallback)
  evals/               eval runner reading specs/evals/cases.yaml
web/                   Angular workspace
  projects/shell/      host shell, renders agent-selected module
  projects/blotter/    ticker blotter micro-app (broadcasts fdc3.instrument)
  projects/detail/     instrument detail micro-app (listens; handles ViewChart)
  projects/ui/         design tokens + our own components + AG Grid wrapper (the swappable seam)
  projects/interop/    InteropService interface + FDC3 adapter + in-memory mock adapter
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
| anthropic-sdk-go | v1.78.x | Model `claude-opus-5-5` |

## Architecture rules
- **Interop is behind an interface.** Components inject an `InteropService` token and never call `window.fdc3` directly. Provide two adapters: `Fdc3InteropService` (real, uses `getAgent()`) and `InMemoryInteropService` (BroadcastChannel, for tests and the no-Sail fallback). OpenFin would be a third adapter. **Never claim OpenFin was run.** Say it is a config swap behind this seam.
- **Components get the design system through wrappers.** Feature code imports from `projects/ui` (`<poc-data-table>`, `<poc-button>`), never from `ag-grid-*` directly. Everything except the grid is our own token-styled component. This seam is a talking point, so keep it clean.
- **One build, many environments.** Apps read `/config.json` (validated against `specs/runtime-config.schema.json`) through the `RUNTIME_CONFIG` token. No `environment.ts` switching. The `auth` block is a reserved seam with `enabled: false`, so don't implement login.
- **The agent returns data, not UI.** The Go endpoint returns JSON that validates against `specs/agent-tool-schema.json`. The shell maps `module` to a lazy-loaded component. On model error, timeout or schema-invalid output, the deterministic fallback runs and the response sets `"source": "fallback"`.

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
- Claude call: `claude-opus-5-5` with **structured outputs** (`output_config.format` with a JSON schema from `specs/agent-tool-schema.json`), or `tool_choice: auto` plus a `strict: true` tool. **Forced `tool_choice` (`any` or `tool`) returns a 400 on Opus 5.5.** Set `output_config.effort` explicitly (`low` is a good fit for routing). Read `ANTHROPIC_API_KEY` from env and never commit it.
- Every agent response is validated against the schema before it is returned.

## Commands (fill in as they become real)
```bash
# Go API
cd api && go test ./... && go run ./cmd/server         # :8080
cd api && go run ./evals -cases ../specs/evals/cases.yaml

# Angular
cd web && npm ci && npx ng serve shell                 # :4200
cd web && npx ng test

# Setup + FDC3 Sail (pinned commit, installed into .sail/)
npm run setup        # check toolchain, install git hooks, fetch + build Sail
npm run sail         # :8090
npm run check-env
```

## Git workflow (mandatory)
- `main` gets one bootstrap commit. After that, everything lands through `<type>/<slug>` branches (`feat/`, `fix/`, `chore/`, `docs/`, `test/`) and squash-merged PRs.
- Commit at every green test run with Conventional Commits (`feat(api): …`). Push the branch often.
- Open PRs with `gh pr create`. The body lists the FR IDs and spec files covered, plus test output.
- **Never merge without the user's explicit approval in chat.** Never push to or force-push `main`. The `pre-push` hook blocks it.
- The history is context for future agents. Read `git log` and closed PRs before re-deciding something.

## Reproducibility (mandatory)
- A fresh clone must work on macOS, Linux and Windows through `docker compose up`, a Dev Container or Codespace, or `npm run setup && npm start`.
- Scripts are Node `.mjs`, not bash. Pin every version. Never rely on a globally installed tool beyond Node, Go, git and Docker.
- Any PR that touches setup must keep the `fresh-clone` workflow green on all three OSes.

## Scope guard
In scope: the specs, Go API, shell, blotter, detail, one intent (`ViewChart`), agent endpoint, ~15 evals, README with diagram, demo recording.
**Cut:** auth, real market data, mobile, OpenFin runtime, persistence beyond in-memory, a mix of UI libraries.
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
0. Run AI-DLC with the `poc` scope: `/aidlc poc Build the Angular interop POC described in specs/SPEC.md`. At the Requirements Analysis gate, check that it references `specs/` rather than restating it.
1. Before implementing an area, run `/implement-spec <area>`. It reads the relevant specs and writes tests from them first.
2. After implementing, run `/spec-check` (or the `spec-reviewer` agent) to catch drift.
3. Run `/explain <file>` on anything you'd be asked to walk through in the interview.
4. Update `docs/PLAN.md` checkboxes at the end of each block.
