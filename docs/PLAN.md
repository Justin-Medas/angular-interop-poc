# Two-Day Plan

Update checkboxes as work lands. If a block overruns by more than 50%, cut from the bottom of that block and record the cut in DECISIONS.md.

## Day 0 (before the clock starts, ~30 min)
- [x] Install Node (26.10) and Go (1.27.1) (`scripts/check-env.sh` verifies)
- [x] Clone and run FDC3 Sail v2 at `../FDC3-Sail` (`npm start` → :8090). **Go:** UI renders; custom apps and directories are supported
- [ ] Resolve PrimeNG license question (DECISIONS #1)
- [ ] `ANTHROPIC_API_KEY` available in the shell
- [x] AI tooling: AI-DLC 2.10, Angular skills, Angular CLI MCP, design-system skill (see CLAUDE.md "AI tooling layers")
- [ ] Restart Claude Code, approve AI-DLC hooks and the `angular-cli` MCP server, run `/aidlc --doctor`

## Day 1 AM: Specs + scaffolding
- [ ] Review and finalize `specs/SPEC.md`, `openapi.yaml`, `fdc3-contract.md`, `agent-tool-schema.json`, `evals/cases.yaml` (drop DRAFT markers)
- [ ] `api/` Go module skeleton, `/healthz`
- [ ] `web/` Angular 22 workspace with `shell`, `blotter`, `detail`, `ui`, `interop` projects
- [ ] Root README stub

## Day 1 PM: Go API + shell + blotter
- [ ] Mock data (6 to 10 tickers, deterministic random walk for history)
- [ ] `/quotes`, `/quotes/{symbol}`, `/quotes/{symbol}/history`, `/watchlist` GET/PUT
- [ ] Contract tests validating responses against `openapi.yaml`
- [ ] `projects/ui` wrappers: `poc-data-table`, `poc-button`, `poc-card`
- [ ] Shell layout + routing (lazy `loadComponent`)
- [ ] Blotter: table bound to `/quotes`, row select (local only)

## Day 2 AM: Detail + FDC3
- [ ] `InteropService` + `InMemoryInteropService` + unit tests
- [ ] `Fdc3InteropService` via `getAgent()` with timeout and fallback badge
- [ ] Blotter broadcasts `fdc3.instrument`; Detail listens
- [ ] `ViewChart` intent raised from Blotter, handled by Detail
- [ ] Register apps in Sail; verify across two tabs; record a GIF

## Day 2 PM: Agent + evals + docs
- [ ] Deterministic fallback (keyword/regex router) + unit tests
- [ ] `/agent/select-module` with Claude structured output + schema validation + timeout
- [ ] Shell command bar → renders selected module, shows `source` badge
- [ ] Eval runner → `docs/eval-report.md`, pass rate ≥ 90%
- [ ] README: architecture diagram, setup, honest limitations
- [ ] Demo recording (~3 min, follows SPEC §4)
- [ ] Interview prep: `/explain` on shell, blotter, interop service, agent handler

## Cut order if behind (cut from the top first)
1. `compare` module (drop it from the enum and from evals)
2. `PUT /watchlist`
3. Real Sail run. Demo on the in-memory adapter across tabs and say so plainly
4. History endpoint and chart. Detail shows quote only, and the ViewChart handler shows a placeholder
