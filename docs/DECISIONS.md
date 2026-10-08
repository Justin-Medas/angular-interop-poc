# Decision Log

Format: context → decision → consequences. Add entries; don't rewrite history.

## #1 UI library: PrimeNG 22, behind wrappers (SUPERSEDED by #7)
- **Context:** PrimeNG 22.1.x matches Angular 22 (peer `@angular/core ^22.1.0`). In June 2026 PrimeFaces moved development to "PrimeUI". The old GitHub repo says it gets security fixes only and that "existing MIT versions remain MIT". The npm package for 22.x and 21.x now declares `"SEE LICENSE IN LICENSE.md"` and points at a different repo (`primeng-nextchapter`).
- **Action before installing:** read `node_modules/primeng/LICENSE.md` after a trial install. If it is free for non-commercial or demo use, proceed. If it is not:
  - **Option A:** pin the last MIT-licensed PrimeNG release (find the matching Angular major and accept an older Angular).
  - **Option B:** Angular Material + CDK table (first-party, MIT, always version-matched).
- **Why wrappers either way:** feature code imports `projects/ui` only, so swapping libraries touches one folder. This is the design-system talking point.

## #2 Desktop Agent: FDC3 Sail v2 (browser), with in-memory fallback
- **Context:** `@finos/fdc3` ships no Desktop Agent. The older `finos/electron-fdc3` repo is stale. `finos/FDC3-Sail` v2 is a browser-based ground-up rewrite on the FDC3 2.2 "for the web" standard. Electron support has been removed, and the project says it is not production-ready.
- **Decision:** target Sail v2 through `getAgent()`. Build `InMemoryInteropService` (BroadcastChannel) first so the demo never depends on Sail working.
- **Honesty line:** "Runs against FINOS Sail. OpenFin, io.Connect and others are an adapter swap behind `InteropService`. I did not run OpenFin."

## #3 Agent output: structured outputs, not forced tool_choice
- **Context:** `claude-opus-5-5` rejects forced `tool_choice` (`any` or `tool`) with a 400. Thinking can't be disabled, and `effort` defaults to `medium`.
- **Decision:** use `output_config.format` (JSON schema from `specs/agent-tool-schema.json`) and set `effort: "low"` explicitly for a routing task. Validate server-side anyway, and fall back deterministically on any failure.
- **Check on Day 2:** confirm structured outputs accept the nullable-enum payload shape. If not, simplify the schema (for example, make payload fields optional) and update the spec first.

## #4 Evals: deterministic grading, N=3 runs per case
- **Decision:** grade with exact checks on module and payload keys, not an LLM judge. Run each case 3 times so nondeterminism shows up as a per-case rate rather than hiding behind one lucky run.

## #5 AI tooling: AI-DLC for process, Angular skills + MCP for framework, local skills for project rules
- **Context:** The user wants the planning recommendations run through a phase-gated AI-DLC workflow, with official Angular guidance and tools.
- **Decision:** Use AI-DLC 2.10 (`aidlc config --harness claude`) with the `poc` scope. The specs in `specs/` stay the source of truth and are referenced from `aidlc/spaces/default/memory/project.md`. The planning chat is onboarded as a knowledge document. The official `angular/skills` are installed as project copies. The Angular CLI MCP server is pinned to `@angular/cli@22` in `.mcp.json`. Design-system rules live in the `poc-design-system` skill.
- **Consequences:** AI-DLC owns `.claude/settings.json` and `.claude/CLAUDE.md`, so our permissions moved to `.claude/settings.local.json`. AI-DLC requires `display_name` frontmatter on every agent in `.claude/agents/`. `~/.local/bin` was added to `~/.zprofile` so hooks can find `aidlc`.

## #6 Git workflow and fresh-clone reproducibility as deliverables
- **Context:** Advice from an engineer friend: link to GitHub, commit often, use feature branches and PRs as a rule, treat the repo and its history as part of the project (good context for future agents), and make the take-home "just work" from a fresh clone on Mac, PC and Linux.
- **Decision:**
  - Private repo `angular-interop-poc`. One bootstrap commit on `main`; afterwards every change goes through `<type>/<slug>` branches, Conventional Commits and a squash-merged PR approved by the human. This is enforced three ways: AI-DLC project rules, a `.githooks/pre-push` hook installed by `npm run setup`, and Claude Code deny rules.
  - Reproducibility ladder: `docker compose up` (Docker only) → Dev Container/Codespaces → native `npm run setup && npm start`. Python's venv doesn't apply to a Node and Go stack. The equivalents are lockfiles plus `npm ci`, the Go `toolchain` directive (Go fetches the pinned toolchain itself), the `devEngines` and `.nvmrc` Node pins, and Sail pinned by commit SHA inside `.sail/` instead of a hand-cloned sibling folder.
  - Repo scripts are Node `.mjs` rather than bash so they run on Windows. `.gitattributes` forces LF line endings.
- **Alternatives rejected:** a Makefile (not native on Windows); mise or asdf for toolchains (adds a global tool reviewers must install); a git submodule for Sail (fragile UX on clone, and it still needs an install and build step).
- **Consequences:** the `fresh-clone` CI runs on macOS and Windows runners, which bill private-repo minutes at 10× and 2× on GitHub Free (2,000 min/month). Keep the job lean and cancel superseded runs. Branch protection on private repos needs GitHub Pro, so on Free the pre-push hook and agent rules are the guardrail.

## #7 UI: AG Grid Community for the grid, our own token-based components for everything else (supersedes #1)
- **Context:** #1 left PrimeNG's license unresolved. PrimeNG 21 and 22 on npm now declare "SEE LICENSE IN LICENSE.md" after development moved to a new project. The only component that needs a heavyweight library is the blotter. It needs a data grid with sorting, column sizing and pinning, row selection, and efficient updates of individual cells as prices tick.
- **Decision:**
  - The grid is AG Grid Community through `ag-grid-angular` 36.x (MIT, peer `@angular/core >= 20`, verified 2026-10-06). It is used only through the `poc-data-table` wrapper in `projects/ui`, and only Community features are used (no Enterprise license key).
  - Everything else (button, card, badge, tabs, command bar) is a small standalone component of our own in `projects/ui`, styled only by design tokens (CSS custom properties). `@angular/cdk` is allowed for accessibility primitives because it's first-party Angular, not a UI library.
  - The AG Grid theme takes its colors and spacing from the same tokens, so the grid and our components can't drift apart visually.
- **Alternatives rejected:** PrimeNG pinned to its last MIT release (forces an older Angular); PrimeNG 22 (see the license findings below); Angular Material (its table is weaker as a trading grid, and it would be a second library next to a grid library); a hand-rolled table (high effort, and it would neither impress nor be fast).
- **PrimeNG license findings (re-checked 2026-10-07, from the npm tarballs):**
  - **PrimeNG 22.x** (`LICENSE.md`: "PrimeUI License") is a commercial, compiled package. It has a free Community License for individuals, which needs annual renewal. "A valid license key is required." It depends on `@primeui/license-manager`, and with a missing or invalid key `primeng-license.mjs` pins a fixed red "Invalid PrimeUI License" banner to every page and logs a console warning.
  - So a fresh clone without the author's key shows the banner (which breaks NFR-R1 to R3), and committing the key would distribute a personal license key. Neither is acceptable.
  - **PrimeNG 20.x and 21.x** are still MIT with no key, but 21.x peers `@angular/core ^21` and would force a downgrade from Angular 22.
  - **Decision unchanged:** non-grid components stay our own, built from tokens. Don't revisit unless PrimeNG's licensing changes.
- **Consequences:** a token-driven component set is the design-system demonstration, which is the author's strength. The swap test becomes: replacing AG Grid touches only `projects/ui/data-table`.

## #8 Runtime configuration via `config.json`, with a reserved auth seam
- **Context:** the same app must run natively, under docker compose, in Codespaces and in CI (NFR-R1 to R3). Angular build-time `environment.ts` files would need one build per environment.
- **Decision:** apps fetch `/config.json` in `provideAppInitializer`, validate it against `specs/runtime-config.schema.json` (FR10), and expose it through a `RUNTIME_CONFIG` InjectionToken. Docker compose and Codespaces supply their own file. The file carries no secrets.
- **Auth seam:** the schema has an `auth` block shaped like typical OAuth2/OIDC SPA settings (clientId, authority, redirectUri, cacheLocation, scopes), with `enabled` fixed to `false`. Auth stays a non-goal: there is no login and no token handling. A real provider (for example an MSAL or other OIDC client library) would bind behind an `AUTH` token without changing callers. In an interview this is a talking point, not a feature.
- **Alternatives rejected:** build-time `environment.ts` (a rebuild per environment breaks "one artifact"); environment variables injected at container start into a generated JS file (more moving parts for the same result).

## #9 Backend language: Go, not Python or TypeScript
- **Context:** Python dominates AI work, so it was worth asking whether the agent service should be Python, or whether to run both.
- **Decision:** keep one Go service. The AI part of this POC is an HTTP API that makes a Claude call, runs a short read-only tool loop, validates JSON against a schema and grades evals by exact match. Anthropic ships an official Go SDK, so none of that needs Python. Python's strengths (training, notebooks, embeddings, agent frameworks) are not used here.
- **Alternatives rejected:** Python for the agent (a third pinned toolchain on three OSes, which NFR-R forbids beyond Node, Go, git and Docker; a second server and contract); Python and Go together (two backends, CORS and contract tests twice, more code to explain); TypeScript for the whole backend (one language across the stack, but loses the clearly separate, contract-first service; the closest alternative if Go ever became a burden).
- **Consequences:** the interview answer is "the language best at contracts and services, calling an LLM", and the repo has one backend.

## #10 One Angular application with library micro-apps
- **Context:** v0.1 listed `blotter` and `detail` as separate projects but gave them routes on the shell's port and said to lazy-load them with `loadComponent`. Separate applications would each need their own port, dev server and config.
- **Decision:** one application (`shell`). `blotter`, `detail`, `ui` and `interop` are libraries. `/apps/blotter` and `/apps/detail` render a library full-page with no shell chrome; Sail opens those URLs, and each Sail tab is its own instance with its own FDC3 connection. Modules the shell embeds share the shell's connection and act as `poc-shell`, which may broadcast and raise `ViewChart` (fdc3-contract.md §1).
- **Alternatives rejected:** separate applications per micro-app (more ports, builds and Docker services for no demo value); Module Federation or Native Federation (independent deployability is a real-world benefit, but it adds build complexity to explain and isn't needed to show interop).
- **Consequences:** one build and one `config.json`. Import boundaries between libraries are enforced by lint (NFR-ARCH2), which keeps the "micro-app" separation honest.

## #11 Our own row menu and line chart, not AG Grid Enterprise or a chart library
- **Context:** AG Grid's context menu is an Enterprise feature (license key), and DECISIONS #7 allows Community only. Charts were unassigned, and adding a chart library would break the one-UI-library rule.
- **Decision:** the row menu is our own component on `@angular/cdk/menu` (first-party, accessible keyboard handling), opened from the grid's Community cell context-menu event (confirm the event name against the installed AG Grid version) and from Shift+F10 or the ContextMenu key. Charts are our own small SVG `poc-line-chart`, styled by tokens.
- **Alternatives rejected:** AG Grid Enterprise (license key; a fresh clone would show a watermark or need a key in the repo); AG Charts, Chart.js or ECharts (a second UI library); a "Chart" action column only (works, but right-click is what traders expect, and the menu is a better accessibility story).
- **Consequences:** two more components in `projects/ui`, both small and explainable, and both covered by the accessibility rules.

## #12 CORS with an exact-origin allowlist
- **Context:** the web app (:4200) calls the API (:8080) directly through `apiBaseUrl`, which is cross-origin. v0.1 only mentioned CORS for Sail's directory fetch. Codespaces forwards ports to different origins again.
- **Decision:** every API route sends CORS headers for origins listed in `CORS_ALLOWED_ORIGINS` (default `http://localhost:4200,http://localhost:8090`) and answers `OPTIONS` preflight. Docker compose and Codespaces set their own list.
- **Alternatives rejected:** a dev-server proxy plus a reverse proxy in Docker with a relative `apiBaseUrl` (no CORS, but a different proxy setup per environment); `Access-Control-Allow-Origin: *` (works, but a bad habit to demonstrate).
- **Consequences:** one environment variable per environment, tested by contract tests.

## #13 Agent v0.2: a workspace plan with one read-only tool
- **Context:** v0.1's agent was a single-call classifier: one prompt in, one module out. That is solid but thin as an example of agentic AI. SPEC §1 talks about AI helping *assemble the workspace*.
- **Decision:**
  - The agent returns a **WorkspacePlan**: 1–3 modules plus an optional `fdc3Action` (`broadcastInstrument`). The endpoint path stays `/agent/select-module`.
  - The agent may call one read-only tool, `get_watchlist_quotes`, at most 3 times, so it can answer requests like "open my worst performer".
  - **Side effects are opt-in.** `fdc3Action` is allowed only when the user explicitly asks to share or sync, and every eval case expects `null` unless it says otherwise.
  - The schema uses one `anyOf` variant per module, so each module's payload is exact, using only keywords structured outputs support. Rules it can't express (counts, ranges, ticker membership) are Go-side semantic checks (SPEC §7.3) that fail over to the deterministic fallback.
  - The agent timeout goes from 8 s to 10 s, because the tool loop can add up to two round trips.
  - Mock data becomes a spec fixture (`specs/mock-data.yaml`) with a frozen clock and seed, so data-dependent eval cases have a known right answer.
- **Alternatives rejected:** keep the classifier (weak as an "agentic" example); workspace plan only or tool loop only (each covers half of the story); an agent framework (more to explain than a ~3-iteration loop).
- **Consequences:** about 10 more eval cases (26 total). Day-2 checks are listed in SPEC §9: structured output plus tools in one request (if not, the final answer becomes a strict `submit_plan` tool) and whether the nested `anyOf` schema compiles. **Cut order:** if Day 2 PM slips, the shell renders only `modules[0]` and ignores `fdc3Action`. The schema and evals stay unchanged.

## #14 Testing: TDD, 100% coverage, Playwright E2E and visual, evals in CI
- **Context:** AI-DLC's `poc` scope defaults to test-after with no coverage minimum, and v0.1 had no E2E, visual or CI test rules. The author wants TDD, 100% coverage, Playwright in the pipeline, visual tests that don't get in the way, and proof that tests check output.
- **Decision** (details in `specs/testing.md`):
  - TDD with a visible red step: a failing `test(...)` commit may come before its implementation; **the pushed head must always be green** (this replaces "each commit leaves the build passing" in `project.md`).
  - 100% coverage (TypeScript lines/branches/functions/statements, Go statements), with whole-file exclusions listed in testing.md and no line-level ignore comments.
  - Playwright E2E on ubuntu and windows with the in-memory interop adapter, plus stubbed plan fixtures that are themselves contract-tested.
  - Visual tests inside one pinned Playwright Linux container, about 10 snapshots, deterministic data.
  - Evals: `fallback` and `replay` on every PR (deterministic, free); `live` when agent code, schema, mock data or cases change, plus nightly.
  - Mutation testing, scoped and non-blocking, to show tests assert results.
- **Alternatives rejected:** test-after (the AI-DLC `poc` default); an 80–90% threshold (a fuzzy number is harder to defend than 100% with a written exclusion list); visual tests on every OS (fonts differ, constant baseline churn); a hosted visual-testing service (external account and cost); live evals on every PR (cost and nondeterministic failures on unrelated changes).
- **Consequences:** roughly half a day of extra work. If time runs short, cut in this order: mutation testing, Windows E2E, the UI gallery snapshots.

## #15 Design tokens: three tiers, dark and light themes, brand palette
- **Context:** tokens were promised in #7 but never specified: no names, no tiers, no theming, no enforcement.
- **Decision** (details in `specs/design-tokens.md`): primitive → semantic → component tiers, with components limited to semantic and component tokens. Dark (default) and light themes redefine only the semantic layer. A green-primary brand palette with warm neutrals; brand green is for fills, and gains use a separate darker or lighter green so "brand" never reads as "price up". System fonts. Enforced by Stylelint, a token contrast test and visual snapshots of a UI gallery.
- **Alternatives rejected:** colors written per component (no theming, no rebrand story); tokens authored as Design Tokens Community Group JSON with a generator script (a good story, but another build step for two days; can be added later without changing token names); proprietary or web fonts (licensing and loading for no demo value).
- **Consequences:** a theme toggle in the demo, and rebranding by editing one file. The contrast test already caught one failing pair while the palette was drafted (loss red on the dark selected row), which was fixed by darkening the selected-row color.

## #16 Accessibility: WCAG 2.2 AA, automated and manual
- **Context:** accessibility was one sentence in a skill. A data-dense trading UI is exactly where keyboard and screen-reader support usually breaks, and desktop container apps commonly run on Windows, where High Contrast mode is common.
- **Decision** (details in `specs/accessibility.md`): WCAG 2.2 AA. axe scans every E2E state (zero serious or critical), axe runs in component tests, angular-eslint accessibility rules, keyboard-only E2E for every demo flow, forced-colors and reduced-motion checks, a token contrast test, and a recorded VoiceOver and NVDA pass of the demo flow.
- **Alternatives rejected:** automated scans only (they miss most keyboard and screen-reader problems); AAA (not realistic for a dense numeric grid).
- **Consequences:** the row menu, tabs and chart have explicit keyboard and ARIA requirements. The README states that automated checks cover only part of WCAG.

## #17 Contract tests: santhosh-tekuri/jsonschema v6 against openapi.yaml
- **Context:** the plan left the OpenAPI 3.1 validator open. Go OpenAPI libraries (kin-openapi) cover 3.0 well but 3.1 only partly.
- **Decision:** OpenAPI 3.1 schemas are JSON Schema 2020-12, so the test loads `specs/openapi.yaml`, registers it as a schema resource and compiles `#/components/schemas/…` (and the inline appd response schema) with `jsonschema/v6` (format assertions on). Real handler responses are validated per route, including error bodies. It already caught an empty watchlist serializing as `null`.
- **Alternatives rejected:** kin-openapi (3.1 gaps); hand-written assertions (they drift from the spec).
- **Consequences:** it validates schemas, not routing or status codes, so the tests assert status separately. The agent route will reuse the same helper, resolving `./agent-tool-schema.json`.

## #18 Mock data: Go table plus drift tests; simplified history timestamps
- **Context:** `go:embed` cannot read `specs/` from inside `api/`, and a runtime path would add an env var that SPEC §6.3 forbids.
- **Decision:** the universe is a Go table and `appd.json` is an embedded copy; tests fail if either differs from `specs/mock-data.yaml` / `specs/appd.json`. History is a seeded walk generated backwards from `last`, so it ends exactly there. Bars are evenly spaced back from `MOCK_NOW` (1D opens 09:30 New York; 5D and 1M do not skip nights or weekends).
- **Alternatives rejected:** parsing the YAML at runtime (a path or env var, and a runtime dependency); a real market calendar (nothing in the demo needs it).
- **Consequences:** the charts show a continuous series, which is fine for fake data. Keeping the spec and the code in step is a test failure, not a convention.

## #19 CI hygiene: one action major, pinned scanners via `go run`, a wider coverage gate
- **Context:** the practices-discovery reviewers (quality, developer and devsecops agents) found drift and gaps in CI. `ci.yml` used `@v4`/`@v5` actions while `fresh-clone.yml` used `@v7`, and `fresh-clone.yml` hard-coded Go `1.27.1` and had no `permissions:` block. `check-coverage.mjs` tested only `./internal/...`, so the planned `api/evals` runner would neither run in CI nor count toward 100%, and its ignore-comment scan walked `.claude/` and `aidlc/`, which hold framework code we don't own. `team.md` (Code Style) affirmed `govulncheck` and a pinned full-history gitleaks scan in the `lint` job.
- **Decision:**
  - Every workflow uses the same, current major of each action (`@v7`) and reads Go from `api/go.mod`. Actions stay pinned by major tag, not SHA: these jobs hold no secrets and run with `contents: read`. SHA pins are reserved for the future `live` eval job, the only one that will see `ANTHROPIC_API_KEY` (team.md Way of Working).
  - `govulncheck@v1.8.0` and `gitleaks@v8.30.1` run with `go run <module>@<version>` in the `lint` job. Go is already a prerequisite, so this needs no global install, no Docker image and no third-party action. gitleaks scans the whole history (`fetch-depth: 0`) with `--redact`; it took about 12 s locally on 19 commits, including the module download.
  - `check-coverage.mjs` tests and measures `go list ./...` minus the testing.md §4 exclusions (only `./cmd/server` today). If `api/evals` is a `package main`, its `main()` must stay a thin flag-parsing call into tested functions, or it needs its own whole-file exclusion and DECISIONS entry. The gate is not lowered for it.
  - The ignore-comment scan covers `api/`, `web/` and `scripts/` only.
  - `.mcp.json` pins `@angular/cli@22.2.2` instead of floating on `@22`. Once `web/` exists it can switch to the workspace's own devDependency.
  - Route packages expose one entry point, `Register(mux, deps)` (`appd.Register(mux)` now matches `quotes.Register(mux, store)`).
- **Alternatives rejected:** `gitleaks/gitleaks-action` (another third-party action to pin, it needs a license key if the repo moves to an organization, and it runs differently from the local command); the gitleaks or govulncheck Docker images (pulls an image per run and adds a tool path that differs from local use); SHA-pinning every action (churn without a secret to protect); an explicit exclusion for `api/evals` instead of measuring it (it holds grading logic, which is exactly what should be tested).
- **Consequences:** the `lint` job gets about 20–30 s slower. A dependency with a reachable known vulnerability, or a committed secret anywhere in history, now fails CI. Bumping a scanner version is a one-line PR.

## #20 Agent model: configurable, Sonnet 5.5 by default
- **Context:** SPEC v0.2 fixed the agent on `claude-opus-5-5` ($4 / $20 per MTok). Every live eval run is 66 requests, and development will need several. `claude-sonnet-5-5` ($2 / $10) accepts the identical request shape: structured outputs, a strict tool, `tool_choice: auto`, `effort: "low"`, no forced tool choice, thinking left at its default.
- **Decision:** the Go API reads `AGENT_MODEL` (SPEC §6.3). The default is `claude-sonnet-5-5`, and it is used for all tests and every development eval run. `claude-opus-5-5` is opt-in. Any other value fails startup. Once the agent and evals are complete, one live run on Opus is compared with the default, and the demo model is recorded here.
- **Alternatives rejected:** Opus only (about twice the cost per run, with no evidence yet that it is needed); `claude-haiku-4-5` ($1 / $5, but it rejects `effort`, so it would need a second request shape to build, test and explain); an open-ended model string (an unvalidated value fails at the first request instead of at startup).
- **Consequences:** the eval report and the recordings name their model. The pass-rate threshold (≥ 90%) applies to whichever model is configured, so a model switch is a measured decision, not a guess.

## #21 Web workspace: Vitest runner, source path mapping, `templateUrl` only
- **Context:** `ng new` (Angular CLI 22.2.2) generated the workspace. `specs/testing.md` §3 asked us to confirm the unit-test runner, and SPEC NFR-ARCH2 names the library imports `@poc/ui` and `@poc/interop`.
- **Decision:**
  - The runner is Vitest through `@angular/build:unit-test`, with `@vitest/coverage-istanbul` and 100% thresholds per project. `public-api.ts` and `main.ts` are excluded from coverage (testing.md §4).
  - Libraries are path-mapped in `web/tsconfig.json` to `projects/<lib>/src/public-api.ts` as `@poc/<lib>`, so feature code and the shell compile against source and no library build is needed for dev or tests.
  - Components use `templateUrl`, never an inline `template`. Angular's compiled output for an inline template adds a branch (`if` with an untaken else path) that the coverage tool reports as 90% branch coverage, and we do not use ignore comments.
  - Every dependency is pinned to an exact version. `ui` and `interop` have no test target until they contain code.
- **Alternatives rejected:** Karma/Jasmine (deprecated in the CLI); building libraries to `dist/` before use (slower loop, nothing gained at this size); Module Federation (DECISIONS #10); line-level ignore comments (forbidden by testing.md §4).
- **Consequences:** a separate `.html` file per component, which also keeps templates easy to read in the interview. Adding a test target to `ui` and `interop` is part of their first PR.

## #22 Lint gates: flat ESLint config, rule tests, OnPush is the Angular 22 default
- **Context:** SPEC NFR-ARCH2, NFR-ARCH3, NFR-A7 and NFR-DS2 promise that lint proves the seams. A lint config nobody tests can silently stop firing.
- **Decision:**
  - `web/eslint.config.mjs` (flat config) bans `ag-grid-*` outside `projects/ui`, `@finos/fdc3` outside `projects/interop`, deep `@poc/*/*` imports, and sibling imports between `blotter` and `detail`. Flat config lets a later `no-restricted-imports` block replace an earlier one, so each library gets one complete list.
  - `web/.stylelintrc.json` bans hex, named colors and `rgb/rgba/hsl/hsla`, and allows only `--poc-*` custom properties; `tokens.css` is the one exemption.
  - `[innerHTML]`, `[outerHTML]` and `bypassSecurityTrust*` are banned with core `no-restricted-syntax`, because angular-eslint 22.5 has no rule for them.
  - `web/tools/lint-rules.test.mjs` (`npm run test:lint`) lints sample snippets and asserts the right rule reports. It runs in the `lint` job, so a config that stops firing fails CI.
  - **OnPush:** in Angular 22 `OnPush` is the default strategy. `prefer-on-push-component-change-detection` therefore reports components that opt out (`ChangeDetectionStrategy.Eager`) and accepts an explicit `OnPush`. We keep writing it explicitly (CLAUDE.md, SPEC NFR-ARCH3) so the intent is visible in each file.
- **Alternatives rejected:** `eslint-plugin-boundaries` or Nx module-boundary tags (another dependency for four libraries); trusting the config without tests; `stylelint-config-standard-scss` (formatting rules unrelated to tokens, noisy on generated code).
- **Consequences:** a new library needs its own block in `eslint.config.mjs` and a test case here. The `tools/` folder is excluded from ESLint.

## #23 CI OS matrix: E2E on Linux and Windows, macOS only for fresh-clone
- **Context:** the `e2e` job runs on `ubuntu-latest` and `windows-latest`; `fresh-clone` runs on all three OSes. The spec did not say why macOS is absent from E2E, which could read as an oversight.
- **Decision:** keep macOS out of `e2e`. The reasons are cost and value. GitHub bills private-repo minutes at 1× for Linux, 2× for Windows and 10× for macOS. E2E drives the same Chromium on every OS, so a macOS leg would add little signal. macOS is still verified where it matters, the native setup path, by `fresh-clone`. Visual baselines are rendered in one Linux container, so they match on every OS.
- **Alternatives rejected:** adding `macos-latest` to the `e2e` matrix (about 10× the cost of the Linux leg for the same browser, plus a slower pipeline); dropping Windows too (Windows has real path and process differences that the `webServer` commands touch, so it earns its 2×).
- **Consequences:** a macOS-only browser or tooling bug in E2E would not be caught by CI. If one appears, add `macos-latest` to the matrix and record it here. The README should say which OSes run which jobs.

## #24 `projects/ui`: wrapper shapes, per-project coverage, unit-level axe
- **Context:** the first `projects/ui` block needed choices the specs left open.
- **Decision:**
  - `poc-button` is an element that renders a native `<button>` inside, so keyboard and form behavior stay native, while feature code still writes `<poc-button>`. `poc-badge` takes `text` plus an optional `label` (long form for assistive tech), because a bare `aria-label` on a `span` is not valid ARIA.
  - `poc-tabs` is the tablist and one panel; the consumer renders the panel content for `selected()` with `@if`/`@switch`. It uses automatic activation.
  - `poc-data-table` ships `rows`, `columns`, `rowId`, `selected` and `rowSelect` only. `rowContextAction` (FR15) lands with the row menu in the blotter block. `format` means: `number` is 2 decimals, `signed` adds an explicit sign (`+`/`−`), `percent` is signed with `%`. Selection comes from the `selected` input, so AG Grid click-selection and checkboxes are off, and the wrapper syncs the node on `modelUpdated`. It registers only the Community modules it needs (`ClientSideRowModel`, `ClientSideRowModelApi`, `RowApi`, `RowSelection`, `CellStyle`).
  - The contrast test reads `tokens.css` with `node:fs` (a one-function type declaration, no `@types/node`), because Vite's `?raw` does not work for `.css` in the Angular unit-test builder.
  - Component specs run `axe-core` through `src/testing/axe.ts` (pinned devDependency). jsdom has no layout, so color contrast is checked by the token test and by the Playwright axe scan of `/dev/ui-gallery`.
  - Each project's `test` target sets `coverageInclude` to its own folder, so a project that imports `@poc/ui` is not measured on `ui` code it does not test. This also counts untested files in the project (it made `app.config.ts` count, so it got a test).
- **Alternatives rejected:** an attribute selector `button[poc-button]` (differs from the documented `<poc-button>` in the design-system skill); `AllCommunityModule` (larger bundle); `@types/node` (a global type surface for one call).
- **Consequences:** a new library test target must set `coverageInclude`. The grid shows some empty space under short tables (`autoHeight`); revisit when the blotter sets its own height.

## #25 No physical values in component styles (NFR-DS5)
- **Context:** the first `projects/ui` components used raw `1.75rem`, `1px`, `600` and `0.6` for target size, borders, font weight and disabled opacity, which bypassed the token layer (found in review of PR #17).
- **Decision:** add `size`, `border`, `font-weight`, `line` and `opacity` tokens (design-tokens.md §5) and a blocking Stylelint rule, `declaration-property-value-disallowed-list`, that bans lengths and times in every declaration and bare numbers for `font-weight`, `opacity`, `line-height` and `z-index`. `tokens.css` is exempt. `0`, `auto` and percentages stay allowed. The AG Grid wrapper drops its `minWidth` and takes row sizing from the `spacing` token.
- **Alternatives rejected:** review-only enforcement (the same mistake returns); banning every number (`0` and `50%` are legitimate).
- **Consequences:** a new kind of value (for example `z-index`) needs a token first; `lint-rules.test.mjs` proves the rule fires.

## #26 Motion tokens: one switch for every animation (NFR-DS6, NFR-A5)
- **Context:** only `--poc-motion-fast` and `-base` existed, and `poc-button` was the only component with a transition. Tabs had none, nothing animated focus, and nothing proved that reduced motion turns animation off.
- **Decision:**
  - Add `--poc-motion-ease`, composed `--poc-transition-color` (hover and selected states) and `--poc-transition-focus` (`outline-offset`), and `--poc-focus-ring-idle` (a transparent outline that the focus ring animates from, and that keeps focus visible in forced-colors mode). The transition tokens use only motion tokens, so the existing `prefers-reduced-motion` block zeroes them.
  - Stylelint allows `transition` only as `var(--poc-transition-*)` lists or `none` and bans `animation*`, so a component cannot add motion that bypasses the switch.
  - JS-driven motion reads the same media query: `poc-data-table` sets `animateRows` from it.
  - Tests: unit (transition tokens contain no literal times; grid rows get `ag-row-no-animation` under reduce), lint (allow-list cases), E2E on `/dev/ui-gallery` (computed `transition-duration` is non-zero with no preference and `0s` under `reducedMotion: reduce`, for button, tab and grid rows).
  - Unit tests get a `matchMedia` stub from `projects/ui/src/testing/match-media.ts` (`setupFiles`), because jsdom has none.
- **Alternatives rejected:** a global `* { transition: none !important }` reduced-motion reset (hides what each component does and fights AG Grid's own CSS); per-component media queries (easy to forget).
- **Consequences:** a new animated property needs a `--poc-transition-<purpose>` token first. The grid's "cell flash off" (FR1) is applied when the blotter adds it, with a test in that block. The unit suite cannot see rows animating (jsdom has no layout); E2E covers that side.
