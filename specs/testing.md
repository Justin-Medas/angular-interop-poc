# Testing Strategy

Status: **v0.2**. The source of truth for SPEC §6.6 (NFR-T). If a test practice here and the code disagree, the code is wrong unless this file changes first.

## 1. Principles
- **Tests trace to spec IDs.** Every test name carries an FR, NFR, rule (`F3`, `S5`) or schema path (§10).
- **Test-driven.** A failing test exists before the code that makes it pass (§2).
- **Deterministic.** Mock data, the clock and the seed are fixed (SPEC §6.3). A test that needs a retry to pass is a bug.
- **Test the output, not the wiring.** Assert what a user, caller or downstream app observes: rendered text and roles, HTTP bodies, broadcasts, plans. Coverage shows code ran; assertions on output show it worked (§4, §9).

## 2. TDD workflow
1. **Red.** Write the smallest test for the next behavior in the spec, named with its ID. Run it and see it fail *for the expected reason*.
2. **Green.** Write the least code that passes it.
3. **Refactor.** Clean up with the tests green.

**Commits make the cycle visible.** A failing test may be committed on a feature branch on its own, as `test(<scope>): <ID> failing test for …`, followed by the commit that makes it pass. **The pushed head of a branch must always be green.** CI tests the head, and squash-merging keeps `main` green. Reviewers see test-before-code in the PR's commit list.

Scaffolding with no behavior (a generated workspace, config files) has no red step; its commit says so. AI agents follow the same cycle: `/implement-spec` writes and runs the failing tests before any implementation.

## 3. Test layers
| Layer | Tool | Location | Runs |
|---|---|---|---|
| Go unit + contract | `go test`, an OpenAPI 3.1 validator loading `specs/openapi.yaml` | `api/internal/**/*_test.go`, `*_contract_test.go` | every PR |
| Angular unit + component | `ng test` (the Angular CLI's default runner; confirm Vitest when the workspace is generated) with TestBed, plus axe-core on rendered components | `web/projects/**/*.spec.ts` | every PR |
| Design-token contrast | unit test reading `tokens.css` (design-tokens.md §7) | `web/projects/ui` | every PR |
| Fixture contracts | unit test: every E2E plan fixture validates against `openapi.yaml` and `agent-tool-schema.json` | `web/e2e/fixtures` | every PR |
| E2E | Playwright (Chromium) + `@axe-core/playwright` | `web/e2e/**/*.e2e.ts` | every PR, ubuntu + windows |
| Visual | Playwright `toHaveScreenshot` | `web/e2e/visual/` | every PR, Linux container |
| Evals | Go runner in `api/evals` | `specs/evals/cases.yaml` | §7 |
| Mutation | StrykerJS; a Go mutation tool if a maintained one exists | scoped, §9 | non-blocking |

## 4. Coverage
- **Target: 100%.** TypeScript: lines, branches, functions and statements. Go: statements (the only metric Go reports), measured with `go test -covermode=atomic -coverprofile`.
- **Enforced in CI.** Angular via the test runner's coverage thresholds. Go via `scripts/check-coverage.mjs`, which reads `go tool cover -func` and fails below 100%. The same script fails if it finds a line-level ignore comment (`istanbul ignore`, `c8 ignore`, `v8 ignore`) anywhere in source.
- **Exclusions are whole files with a reason.** Adding one needs a DECISIONS entry.

| Excluded | Reason |
|---|---|
| `api/cmd/server/main.go` | Wiring only (env, router, listen). Kept tiny; exercised by E2E |
| `web/projects/shell/src/main.ts` | Bootstrap call only |
| `web/projects/*/src/public-api.ts` | Re-exports only |
| `**/*.spec.ts`, `**/*_test.go`, `web/e2e/**` | Tests themselves |

- **Honest limit:** 100% coverage proves every line ran under test, not that a test checked its result. Mutation testing (§9) and output-focused assertions (§1) cover that gap.

## 5. E2E (Playwright)
- **Pinned** as a devDependency. CI installs only Chromium (`npx playwright install --with-deps chromium`). Desktop interop containers embed Chromium, so Chromium is the browser that matters.
- **Servers.** Playwright's `webServer` starts the Go API with the SPEC §6.3 defaults and no API key, and the web app with `config.ci.json` (`environment: "ci"`, `interop.provider: "in-memory"`, `quotes.pollIntervalMs: 0`).
- **Interop without Sail.** Blotter and Detail open as two pages in one browser context, so the in-memory BroadcastChannel adapter connects them (fdc3-contract.md §6).
- **Agent without a key.** Real calls exercise the fallback. Tests that need a model-shaped plan stub `POST /agent/select-module` with `page.route`, using fixtures in `web/e2e/fixtures/plans/*.json`. The fixture-contract unit test keeps them valid.
- **Selectors are accessible:** `getByRole` and `getByLabel` only. If a test can't find an element by role and name, that is an accessibility bug.
- **Every E2E state runs an axe scan** (accessibility.md §3).
- **Runs on** `ubuntu-latest` and `windows-latest`.
- **Flakes.** 0 retries locally; 1 retry in CI with a trace recorded on the retry. A test that passed only on retry is listed in the job summary and fixed or quarantined with an issue before merge.

**Required E2E specs** (one or more tests each):
| ID | Covers |
|---|---|
| E2E-1 | Blotter shows the watchlist from mock data (FR1) |
| E2E-2 | Selecting a row by click and by keyboard updates Detail in a second page (FR2, FR3) |
| E2E-3 | Row menu by right-click and by Shift+F10 raises ViewChart; Detail shows its chart tab (FR4, FR15) |
| E2E-4 | Detail shows the unknown-instrument state on 404 (FR3) |
| E2E-5 | Chart range switch 1D / 5D / 1M (FR12) |
| E2E-6 | Command bar against the real API returns a fallback plan; the source badge reads `fallback` (FR6, FR7, FR14) |
| E2E-7 | A stubbed two-module plan renders in order, announces the rationale and focuses the first heading (FR8) |
| E2E-8 | A stubbed plan with `fdc3Action` updates Detail in a second page (FR17) |
| E2E-9 | A stubbed plan with an unknown module shows the error card (FR8) |
| E2E-10 | An invalid `config.json` shows the config error screen (FR10) |
| E2E-11 | The theme toggle switches grid and components, and the choice survives a reload (FR11) |

## 6. Visual tests
- **One environment.** Run only inside the pinned `mcr.microsoft.com/playwright` Linux image, the same version as the npm package. The CI job uses it as its `container`; `npm run test:visual` and `npm run test:visual:update` run the same image through Docker, so baselines match on macOS, Windows and Linux. Baselines are committed under `web/e2e/visual/__screenshots__/`.
- **Determinism.** API defaults (`MOCK_TICK=off`, fixed `MOCK_NOW`), `pollIntervalMs: 0`, `animations: "disabled"`, `reducedMotion: "reduce"`, grid cell flash off, hidden caret, 1280×800 viewport, the container's fonts.
- **Small fixed set (10 snapshots):** blotter; Detail quote tab; Detail chart tab (1D); shell with a movers plan; shell with a two-module plan; fallback badge state; config error screen; `/dev/ui-gallery` in dark, light and forced-colors. App screens use the dark theme; the gallery covers both themes.
- **Tolerance:** Playwright's default per-pixel threshold and `maxDiffPixelRatio: 0.002`.
- **Not intrusive.** A failure uploads the diff images and the HTML report as an artifact, and the failure message prints the update command. Baseline updates go in their own commit, `test(visual): update baselines — <reason>`, so reviewers can see them.

## 7. Evals in CI
The runner (`api/evals`, Go) calls `internal/agent` in-process with an injected model client. The HTTP layer is covered by contract tests instead.

| Mode | Model client | Deterministic | When |
|---|---|---|---|
| `fallback` | none | yes | every PR (all `mode: fallback` cases) |
| `replay` | recorded model responses in `api/evals/recordings/` | yes | every PR (all `mode: model` cases) |
| `live` | real Claude | no | PRs that change `api/internal/agent/**`, `specs/agent-tool-schema.json`, `specs/mock-data.yaml` or `specs/evals/**`; nightly; manual dispatch |

- `replay` checks the whole validation, semantic-check and grading pipeline against real past model output, at no cost.
- `live` uses the `ANTHROPIC_API_KEY` repo secret and is blocking when it runs. It calls the model named by `AGENT_MODEL` (SPEC §6.3), which defaults to `claude-sonnet-5-5`; every live run during development uses that default. The report and each recording name the model they came from. A live run with `-record` refreshes the recordings. One live run is 22 model cases × 3 runs = 66 requests.
- The report is uploaded as an artifact. The committed `docs/eval-report.md` comes from the recorded demo run (SPEC §8).

## 8. CI pipeline
`fresh-clone.yml` (exists) proves the native quickstart on all three OSes. A new `ci.yml` runs the tests:

| Job | Runner | Blocking | Runs |
|---|---|---|---|
| `lint` | ubuntu | yes | ESLint (import boundaries, angular-eslint template accessibility), Stylelint, `gofmt -l`, `go vet` |
| `unit-go` | ubuntu | yes | `go test` with coverage, then `check-coverage.mjs` |
| `unit-web` | ubuntu | yes | `ng test` with coverage thresholds (includes the contrast and fixture tests) |
| `e2e` | ubuntu, windows | yes | Playwright functional + axe |
| `visual` | ubuntu, Playwright container | yes | visual snapshots |
| `evals` | ubuntu | yes | `fallback` + `replay`; `live` when §7 triggers it |
| `mutation` | ubuntu | no (`continue-on-error`) | §9; on relevant path changes and weekly |

- Each job lands in the PR that creates the code it tests. Superseded runs are cancelled.
- Windows runners bill at 2× on private repos, so only `e2e` and `fresh-clone` use them.

## 9. Mutation testing
- **Purpose:** prove the tests check results, not just execute lines.
- **Scope:** the interop adapters and the shell's plan-to-component mapping (StrykerJS), and the Go fallback router and semantic validator (a Go mutation tool such as gremlins, after checking it is maintained; otherwise TypeScript only, and the report says so).
- **Non-blocking.** The job summary reports the mutation score (aim ≥ 80%) and lists surviving mutants, which the PR either kills with a test or explains.

## 10. Naming and traceability
- Go: `TestGetQuote_FR3_UnknownSymbol404`; table rows named by rule, e.g. `{name: "F3 chart with month range"}`.
- Angular: `it('FR2 broadcasts fdc3.instrument on row select')`.
- Playwright: `test('E2E-3 FR15 Shift+F10 opens the row menu and raises ViewChart')`.
- The `spec-reviewer` agent fails an FR that no test name references.
