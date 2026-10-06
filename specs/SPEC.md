# SPEC — Angular Interop POC

Status: **DRAFT v0.1**. Review and edit before implementation starts.

## 1. Problem
Trading desks run many small apps that must share context (the selected instrument) without tight coupling. Teams also want AI to help assemble the workspace, but nondeterministic output can't drive UI unchecked. This POC demonstrates both, with a contract-first, tested approach.

## 2. Goals
- **G1 Interop.** Selecting a row in the Blotter makes the Detail app show that instrument. This must work across two separate browser windows or tabs through an FDC3 Desktop Agent.
- **G2 Intent.** Raising `ViewChart` from the Blotter opens or focuses Detail with its chart tab active.
- **G3 Contract-first API.** The Go API serves quotes and a watchlist from mock data, and every response validates against `openapi.yaml`.
- **G4 Agentic module selection.** `POST /agent/select-module` takes a natural-language request plus an optional FDC3 context and returns schema-valid JSON naming one module and its payload. The shell renders that module.
- **G5 Measured nondeterminism.** An eval suite of about 15 cases reports a pass rate, with a pass threshold of ≥ 90%. The fallback path is deterministic and covered by unit tests.
- **G6 Swappable seams.** The interop adapter and the design-system wrappers can be replaced without touching feature components.

## 3. Non-goals
Authentication or authorization, real market data, mobile layouts, running OpenFin or any commercial desktop container, persistence across restarts, multi-user support, production hardening, or mixing UI libraries.

## 4. Users and demo script
One persona: a trader or the interviewer. Demo flow (about 3 minutes):
1. Start Sail and open Blotter and Detail in two Sail tabs on the same user channel.
2. Click AAPL in the Blotter. Detail updates (broadcast).
3. Right-click → View Chart (intent). Detail switches to the chart tab.
4. In the shell's command bar, type "show me what's moving in my watchlist". The agent picks `watchlist-movers` and the shell renders it.
5. Kill the API key and repeat. The fallback picks a module and the badge shows "fallback".
6. Show the eval report (pass rate, failures).

## 5. Functional requirements
| ID | Requirement | Verified by |
|---|---|---|
| FR1 | Blotter lists watchlist instruments with last, change and change % from `GET /quotes?symbols=` | contract test + component test |
| FR2 | Row selection broadcasts `fdc3.instrument` (see fdc3-contract.md §2) | interop adapter test (in-memory) + manual Sail check |
| FR3 | Detail listens for `fdc3.instrument` and fetches `GET /quotes/{symbol}` | component test with mock adapter |
| FR4 | Detail handles the `ViewChart` intent | adapter test + manual Sail check |
| FR5 | `GET /watchlist` and `PUT /watchlist` operate on in-memory state | contract tests |
| FR6 | `POST /agent/select-module` returns `ModuleSelection` (agent-tool-schema.json) | contract test + schema validation |
| FR7 | On model error, timeout (> 8 s) or invalid output, return the deterministic fallback with `source: "fallback"` | unit tests |
| FR8 | Shell maps `module` to a lazy-loaded component and passes `payload` as inputs; an unknown module shows an error card | component test |
| FR9 | The eval runner prints a per-case pass/fail table and an overall rate, and exits non-zero below the threshold | run it |

## 6. Non-functional
- Local only.
- **Fresh-clone reproducibility (NFR-R).** On macOS, Linux and Windows:
  - NFR-R1: `docker compose up` starts the API (:8080), web (:4200) and Sail (:8090). Docker is the only host dependency.
  - NFR-R2: the native path `npm run setup && npm start` works with only Node (per `.nvmrc`) and Go ≥ 1.24.
  - NFR-R3: the repo opens in a Dev Container or Codespace with no other setup.
  - NFR-R4: every toolchain and third-party checkout is pinned (Node range, Go toolchain, `package-lock.json`, Sail commit SHA).
  - NFR-R5: GitHub Actions runs the native quickstart and tests on all three OSes for every PR.
- The agent endpoint p95 is under 8 s; the fallback responds in under 50 ms.
- No secrets in the repo. `ANTHROPIC_API_KEY` comes from the environment.
- Every Angular component uses OnPush, is standalone and uses signals.

## 7. Module catalog (what the agent can choose)
| module | Purpose | payload |
|---|---|---|
| `blotter` | Watchlist table | `{ symbols?: string[] }` |
| `instrument-detail` | Single instrument quote + info | `{ symbol: string }` |
| `price-chart` | Intraday chart | `{ symbol: string, range: "1D"\|"5D"\|"1M" }` |
| `watchlist-movers` | Top gainers/losers in the watchlist | `{ direction: "up"\|"down"\|"both", limit: int }` |
| `compare` | Side-by-side for 2–4 symbols | `{ symbols: string[] }` |
| `none` | Request is out of scope; show a message | `{ reason: string }` |

## 8. Acceptance criteria (done = all true)
- [ ] The demo script in §4 runs end to end, recorded.
- [ ] `go test ./...` and `ng test` pass.
- [ ] NFR-R1–R5 hold: the `fresh-clone` workflow is green on ubuntu, macos and windows on the final PR, and the README quickstart was followed verbatim from a fresh clone.
- [ ] The repo's history reads as a story: one squash-merged PR per Bolt or Unit, each linking its FR IDs.
- [ ] Eval pass rate ≥ 90% on the recorded run, with the report committed under `docs/eval-report.md`.
- [ ] README has an architecture diagram, setup steps, and an "honest limitations" section (no OpenFin, mock data, Sail not production-ready).

## 9. Open questions
- PrimeNG license for v22 (DECISIONS #1).
- ~~Does Sail v2 support custom app entries with local URLs?~~ **Yes (verified 2026-10-06):** register them in Sail settings under "Custom Apps" (URL plus intents), or add a directory URL under "Directories". The plan is to serve `specs/appd.json` from the Go API and add it as a directory.
