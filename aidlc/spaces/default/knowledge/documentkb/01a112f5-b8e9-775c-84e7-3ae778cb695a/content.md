# POC Planning Recommendations (pre-AI-DLC, 2026-10-06)

Summary of the planning conversation that produced `specs/`, `docs/PLAN.md` and `docs/DECISIONS.md`. Facts were verified on 2026-10-06. Where the original advice was corrected, the correction is listed under it.

## Goal
A two-day POC for an interview. The role is about 30–40% hands-on Angular, so the author must be able to walk through the code (standalone components, signals, DI) rather than just demo it.

## Architecture (as recommended)
- An Angular shell and two micro-apps: a ticker **blotter** that broadcasts `fdc3.instrument`, and an **instrument detail** view that listens. One intent, `ViewChart`.
- UI library: PrimeNG (its data table suits a blotter). Do not mix libraries. Keep components behind thin wrappers so the design system can be swapped, which is the author's actual strength.
- Go API: quotes and watchlist from mock data, defined in OpenAPI first.
- Agentic workflow: a Go endpoint takes a context or request, calls a model, and returns structured JSON naming which module to load and with what payload. Angular renders that choice. This is organism-level selection, with a deterministic fallback.
- Evals: about 15 scenarios with expected module choices and a pass-rate report. This answers the nondeterminism question directly.
- Spec-driven: write SPEC.md, openapi.yaml, the FDC3 contract, the agent schema and the eval cases before any code.

## Corrections from verification
1. **Desktop Agent.** `@finos/fdc3` ships no Desktop Agent. The original suggestion was the 2022 `finos/electron-fdc3` repo. **Corrected:** use `finos/FDC3-Sail` v2, a browser-only rewrite (Electron removed) built on FDC3 2.2 for the web. It is not production-ready. Its last commit was 2026-10-01, and it depends on `@finos/fdc3@2.2.3`, the same version this POC pins.
2. **OpenFin.** Not run. It sits behind the `InteropService` adapter as a configuration swap. Never claim otherwise.
3. **Versions.** Angular 22.2.x needs Node `^22.22.3 || ^24.15.0 || >=26`. PrimeNG 22.1.x has peer `@angular/core ^22.1.0`, so the versions are compatible. **However**, PrimeNG moved development to "PrimeUI" in June 2026. The npm license is now "SEE LICENSE IN LICENSE.md", so check it before relying on PrimeNG; Angular Material is the fallback.
4. **Agent call.** `claude-opus-5-5` rejects forced `tool_choice` (`any` or `tool`). Use structured outputs (`output_config.format`) with an explicit `effort`, and validate server-side.
5. **UI library (superseded later the same day).** PrimeNG was replaced by AG Grid Community plus our own token-based components; see `docs/DECISIONS.md` #7.

## Two-day budget
- Day 1 AM: specs and scaffolding.
- Day 1 PM: Go API with contract tests, then the Angular shell and blotter.
- Day 2 AM: detail app, plus FDC3 broadcast and listener working across two windows.
- Day 2 PM: agent endpoint, evals, README with an architecture diagram, and a demo recording.

## Cut list
Auth, real market data, mobile, OpenFin runtime.
