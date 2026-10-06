# Angular Interop POC

Angular 22 shell + two FDC3 micro-apps (Blotter → Detail), a contract-first Go API, and a Claude-backed endpoint that picks which UI module to load, with a deterministic fallback and a pass-rate eval.

> Status: specs drafted; implementation not started. See `docs/PLAN.md`.

## Start here
1. `./scripts/check-env.sh`
2. Read `specs/SPEC.md`
3. In Claude Code: `/implement-spec go-api`

## Honest limitations
- Market data is mock. No auth.
- Interop runs against FINOS FDC3 Sail (browser, not production-ready) or an in-memory BroadcastChannel adapter. OpenFin and other containers are an adapter swap behind `InteropService`; **they were not run**.

_Architecture diagram: TODO (Day 2 PM)._
