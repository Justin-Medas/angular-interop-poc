**Collaborator:** aidlc-developer-agent

## Contribution

Independent review of the lead draft from the code side: naming, layer boundaries, error handling, file organization and code style. Evidence read: `api/**` at HEAD `b6d0c06` (9 source files, 7 test files), root `CLAUDE.md`, `specs/SPEC.md` §6.5 (NFR-ARCH1–5), `specs/fdc3-contract.md` §2, `specs/testing.md` §10, `.claude/skills/poc-design-system/SKILL.md`, `docs/DECISIONS.md` #10, #11, #17, #18. There is no `web/` yet, so every Angular point below comes from specs and the skill, not from code.

### 1. What the Go code already does consistently (habits worth writing down)

| Habit | Evidence |
|---|---|
| One package per concern under `api/internal/<concern>/`. `cmd/server/main.go` only wires things and is excluded from coverage | `config`, `httpx`, `mock`, `quotes`, `appd`, `server`. `main.go` header comment cites testing.md §4 |
| Dependencies are passed in as arguments, with no package-level mutable state and no DI framework. Clocks and env readers are injected functions, which keeps tests deterministic | `config.Load(getenv func(string) string)`, `RunTicker(ctx, interval, clock func() time.Time)`, handlers built as `func listQuotes(s *mock.Store) http.HandlerFunc` |
| A route package exposes `Register(mux, deps)`, and `server.New` composes the packages | `quotes.Register(mux, store)` |
| Setup errors come back as `error` (`fmt.Errorf`) and fail fast in `main` (`log.Fatal`). HTTP errors all go through `httpx.WriteError`, with the OpenAPI `Error` shape and a stable `code` enum (`invalid_request`, `invalid_symbol`, `unknown_symbol`). Nothing calls `http.Error` with plain text | `config.go`, `httpx/json.go`, `quotes.go` |
| Inputs are validated at the boundary: `symbolRE`, `DisallowUnknownFields`, size limit, uniqueness. The server never normalizes input on the caller's behalf | `quotes.go` |
| Errors are discarded only explicitly with `_ =`, and only on response writes after the status is already sent | `httpx.WriteJSON`, `appd.Handler`, `server.healthz` |
| Comments cite the spec ID they implement (`FR18`, `NFR-S2`, `SPEC §6.3`, `DECISIONS #18`) | `cors.go`, `config.go`, `store.go` |
| When a spec file has to be copied into the module, a drift test keeps the copy equal to the spec | `appd/appd.json` (go:embed) and `mock/universe.go` against `specs/mock-data.yaml` |
| Test names follow `Test<Unit>_<SpecID>_<Behavior>` (28 of 28) | e.g. `TestCORS_FR18_PreflightIs204OnAnyRoute`, `TestLoad_SPEC63_Invalid` |

Small inconsistencies, for Code Generation to tidy rather than for the practices:
- `server.healthz` encodes JSON by hand instead of calling `httpx.WriteJSON`.
- `appd` exports `Handler` while `quotes` exports `Register`.
- Several exported identifiers have no doc comment (`quotes.Register`, `appd.Handler`, `httpx.WriteJSON`, `Store.Watchlist`, `Store.SetWatchlist`). `go vet` does not catch this and no linter enforces it.

### 2. Suggested additions to the team.md `## Code Style` section

The lead's bullets cover tooling (formatter, linter, naming idiom, test IDs). They leave out the conventions an agent most needs during Code Generation: boundaries and error handling. Add these after the lead's bullets:

- **Small, explainable files.** One concern per file and one concern per package. Choose the plain construct over an abstraction, and add a helper only once a second caller exists. The author must be able to walk through any file live.
- **Traceability in code.** A comment on non-obvious code names the spec ID or DECISIONS entry it implements. Test names carry the spec ID (`specs/testing.md` §10).
- **Go structure.** `cmd/server` only wires things. Each concern is a package under `internal/`. A package with routes exposes `Register(mux, deps)`, and its handlers are closures over explicit dependencies. Nothing reads the environment or the wall clock except through an injected function.
- **Go errors.** Setup and config errors are returned and fail fast at startup. Every HTTP error response goes through `httpx.WriteError` with an OpenAPI `Error.code`, and plain-text `http.Error` is never used. An error is ignored only with an explicit `_ =` on a response write.
- **Angular structure (applies when `web/` lands).** Feature libraries (`blotter`, `detail`) import only the public entry points `@poc/ui` and `@poc/interop`. They never deep-import into another library's `src/` and never import each other. Micro-apps talk to each other only through `InteropService` (NFR-ARCH2, DECISIONS #10). Swappable services are `InjectionToken`s named in `SCREAMING_CASE` (`INTEROP`, `RUNTIME_CONFIG`) and are supplied by a `provideX()` function.
- **Angular naming.** Component selectors use the `poc-` prefix and `ui` component classes use the `Poc` prefix (`poc-data-table`, `PocDataTable`). Inputs and outputs are named for the domain, never for the library underneath (`rowSelect`, not `rowSelected`; `columns`, not `columnDefs`). File names follow the CLI default for Angular 22 (`poc-data-table.ts`, with no `.component` suffix, as in the design-system skill).
- **Angular errors.** HTTP and interop failures become visible state (a signal rendered in the UI, plus a polite live region where `specs/accessibility.md` asks for one) and are never swallowed. The FDC3 to in-memory switch and the agent's `source: fallback` are always shown with their reason as text.
- **Styling.** Component styles use only semantic or component tokens (`var(--poc-…)`), never primitives or raw color values (`specs/design-tokens.md`, enforced by Stylelint).

If the team prefers to keep `team.md` Code Style tool-only, the same bullets fit equally well under `project.md` § Code Style through the learnings path. They should still be recorded somewhere: today they exist only in specs and in one skill, and Code Generation agents do not load that skill for Go work.

### 3. Candidate rules (additions to `discovered-rules.md`)

The human has already stated both of these in specs. Neither is yet a rule line in `project.md` § Forbidden.

```
NEVER import one feature library from another (blotter, detail) or deep-import a library's internals; feature code imports only @poc/ui and @poc/interop, and micro-apps communicate only through InteropService
NEVER use primitive tokens or raw color values (hex, rgb(), hsl(), named colors) in component styles outside tokens.css; components use semantic or component tokens only
```
Sources: SPEC §6.5 NFR-ARCH2, DECISIONS #10, `specs/design-tokens.md`, and the root `CLAUDE.md` rule "Styling comes only from tokens". The existing Forbidden lines cover `ag-grid-*` and `@finos/fdc3`, but they do not cover imports between feature libraries or raw colors.

### 4. Interview inputs

- **Q6 (TS formatter).** Use Prettier with a committed config. If the config that `ng new` generates for Angular 22 is adequate, keep it unchanged. Run `prettier --check` in the CI `lint` job next to ESLint and Stylelint. A formatter config nobody runs drifts, and diffs that contain only formatting changes make the red-to-green story harder to read.
- **Go linter depth (new question).** Should Go stay on `gofmt` + `go vet`, or add `staticcheck`? It is one pinned `go run` call, so it fits the "no global tools" rule. Either answer is fine for a POC, but the choice should be on record. This overlaps with the devsecops agent's area.

## Positions

- AGREE: Code Style defers to the repo-configured formatter and linter, and CI blocks the merge on failure — this matches `org.md` and the current `lint` job.
- AGREE: test names carry the spec ID — all 28 Go tests already follow `Test<Unit>_<SpecID>_<Behavior>`.
- AGREE: "Tests assert observable output, not internal wiring" — the Go suite tests through `httptest` and the contract validator, not through private functions. Angular should match this.
- AGREE: both candidate rules in `discovered-rules.md` (green pushed head; no line-level coverage-ignore comments) — both are human-stated and mechanically checkable (`check-coverage.mjs` already enforces the second).
- OBJECT: Code Style is limited to tooling and leaves out layer boundaries and error handling — those are the conventions an agent is most likely to get wrong during Code Generation, and right now they live only in specs and a skill that does not load for Go work. Add the section 2 bullets, here or in `project.md`.
- OBJECT: "Branches live hours, not days" is stated as a habit — it describes the six PRs so far, but a Unit such as the Angular shell skeleton can reasonably take most of a day. As a stated rule it pushes agents to split work artificially. Suggested wording: "Branches merge within a day, well inside the org's 1–2 day window."
