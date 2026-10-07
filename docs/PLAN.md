# Two-Day Plan

Update checkboxes as work lands. If a block overruns by more than 50%, cut from the bottom of that block and record the cut in DECISIONS.md.

## Day 0 (before the clock starts, ~30 min)
- [x] Install Node (26.10) and Go (1.27.1) (`scripts/check-env.sh` verifies)
- [x] Clone and run FDC3 Sail v2 at `../FDC3-Sail` (`npm start` → :8090). **Go:** UI renders; custom apps and directories are supported
- [x] Resolve UI library question → AG Grid Community + own token components (DECISIONS #7)
- [x] `ANTHROPIC_API_KEY` created (goes in the gitignored repo-root `.env`, SPEC §6.3)
- [x] AI tooling: AI-DLC 2.10, Angular skills, Angular CLI MCP, design-system skill (see CLAUDE.md "AI tooling layers")
- [x] Restart Claude Code, approve AI-DLC hooks and the `angular-cli` MCP server, run `/aidlc --doctor`
- [ ] GitHub: `gh auth login`, private repo `angular-interop-poc`, bootstrap commit on `main`, then everything else through PRs
- [ ] Docker Desktop installed and running (to test `docker compose up` and the Dev Container locally)
- [x] Cross-platform setup: `npm run setup` (pinned Sail, git hooks), `.gitattributes`, `.nvmrc`, Dev Container, `fresh-clone` CI on 3 OSes

## Working rules (every block)
- TDD (`specs/testing.md` §2): failing test first, named with its spec ID. The pushed head is always green.
- One feature branch and one PR per Bolt or Unit. Commit at every green test run. Squash-merge only after CI is green and you approve.
- When a block adds a service (api, web), add it to `docker-compose.yml` and to the `fresh-clone` workflow in the same PR. When a block adds code, add its CI job (`specs/testing.md` §8) in the same PR.
- Coverage stays at 100% (with the testing.md exclusions) from the first PR, so it never has to be clawed back.

## Day 1 AM: Specs + scaffolding
- [x] Review and finalize specs v0.2: SPEC, openapi, fdc3-contract, agent schema, mock data, appd, runtime config, evals, testing, design tokens, accessibility (DECISIONS #9–#16)
- [x] Run `/aidlc-practices-discovery` to record TDD, coverage and WCAG 2.2 AA in `team.md` (team.md + 6 rules in project.md, 2026-10-07)
- [x] `api/` Go module skeleton, `/healthz` (with `agent` mode), CORS middleware, env config (SPEC §6.3)
- [x] `web/` Angular 22 workspace: `shell` application + `blotter`, `detail`, `ui`, `interop` libraries; `/apps/*` routes (DECISIONS #21)
- [ ] Lint and quality gates: ESLint import boundaries + angular-eslint accessibility rules, Stylelint token rules, coverage thresholds, `scripts/check-coverage.mjs`
- [ ] `ci.yml` with `lint`, `unit-go`, `unit-web`; Playwright scaffold with a first E2E (shell loads, axe clean) and the `e2e` job
- [ ] Root README stub
- [ ] Root `npm start` / `npm test` that run api + web (+ Sail) cross-platform; `api/go.mod` declares `toolchain go1.27.1`
- [ ] `docker-compose.yml` with `api`, `web`, `sail` services and healthchecks; CI job runs `docker compose up --wait` on ubuntu

## Day 1 PM: Go API + design system + blotter
- [x] Mock data from `specs/mock-data.yaml` (`MOCK_SEED`, `MOCK_NOW`, `MOCK_TICK`), deterministic history
- [x] `/quotes`, `/quotes/{symbol}`, `/quotes/{symbol}/history`, `/watchlist` GET/PUT, `/appd/v2/apps`, error codes
- [x] Contract tests validating responses against `openapi.yaml` (pick the OpenAPI 3.1 validator; record it in DECISIONS)
- [ ] `projects/ui`: `tokens.css` per `specs/design-tokens.md`, contrast test, `poc-data-table` (AG Grid theme from tokens), `poc-button`, `poc-card`, `poc-badge`, `poc-tabs`, `/dev/ui-gallery`
- [ ] Runtime config: `/config.json` + schema validation in `provideAppInitializer`, `RUNTIME_CONFIG` token, config error screen (FR10); `theme` + toggle (FR11); compose, Codespaces and CI variants
- [ ] Shell layout + routing (lazy `loadComponent`)
- [ ] Blotter: table bound to `/quotes` with polling (FR1), keyboard row selection, row context menu on `@angular/cdk/menu` (FR15)
- [ ] `visual` CI job (pinned Playwright container) with the first snapshots

## Day 2 AM: Detail + FDC3
- [ ] `InteropService` (`status` signal, `viewChart$`) + `InMemoryInteropService` + `provideInterop()` + unit tests
- [ ] `Fdc3InteropService` via `getAgent()` with timeout and fallback badge
- [ ] Blotter broadcasts `fdc3.instrument`; Detail listens (FR2, FR3)
- [ ] Detail Quote and Chart tabs with `poc-line-chart` and range switch (FR12); `ViewChart` handled (FR4)
- [ ] E2E-1 to E2E-5 with axe scans, keyboard paths, forced-colors and reduced-motion checks
- [ ] Register apps in Sail from `specs/appd.json`; verify across two tabs; record a GIF

## Day 2 PM: Agent + evals + docs
- [ ] Deterministic fallback F1–F7 (FR19) and semantic checks S1–S8 (FR20), table-driven tests
- [ ] Day-2 API checks (SPEC §9): structured output + tools together; nested `anyOf` schema compiles
- [ ] `/agent/select-module`: structured output, `get_watchlist_quotes` tool loop (FR16), timeout, schema + semantic validation (FR6, FR7)
- [ ] Shell command bar, plan renderer (1–3 modules, live region, focus), `fdc3Action`, badges (FR8, FR14, FR17)
- [ ] Module components: `price-chart`, `watchlist-movers`, `compare`, `none` (FR13)
- [ ] E2E-6 to E2E-11 with stubbed plan fixtures + fixture contract test
- [ ] Eval runner (`live` / `replay` / `fallback`), recordings, `evals` CI job → `docs/eval-report.md`, model ≥ 90%, fallback 100%
- [ ] At the end only: one live eval run with `AGENT_MODEL=claude-opus-5-5`, compare with the default, and record the demo model in DECISIONS #20
- [ ] `mutation` CI job (non-blocking)
- [ ] Screen-reader pass (VoiceOver, NVDA) → `docs/a11y-report.md`
- [ ] README: architecture diagram, setup, honest limitations
- [ ] Fresh-clone rehearsal: clone into a temp dir, follow the README quickstart verbatim (Docker path and native path)
- [ ] Demo recording (~4 min, follows SPEC §4)
- [ ] Interview prep: `/explain` on shell, blotter, interop service, agent handler, tokens

## Cut order if behind (cut from the top first)
1. Multi-module plans and `fdc3Action` in the shell: render `modules[0]` only. The schema and evals stay unchanged (DECISIONS #13)
2. Mutation testing
3. `compare` module (drop it from the schema and evals; update the spec first)
4. Windows E2E (keep ubuntu)
5. UI gallery visual snapshots (keep the app screens)
6. `PUT /watchlist`
7. Real Sail run. Demo on the in-memory adapter across tabs and say so plainly
8. History endpoint and chart. Detail shows quote only, and the ViewChart handler shows a placeholder

Never cut: TDD, the coverage gate, ubuntu E2E with axe scans, the token contrast test, the deterministic fallback.
