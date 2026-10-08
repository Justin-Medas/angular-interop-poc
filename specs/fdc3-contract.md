# FDC3 Contract

Status: **v0.2**. Targets FDC3 2.2 (`@finos/fdc3@2.2.x`) with apps connecting through `getAgent()`. The calls we make (`broadcast`, `addContextListener`, `raiseIntent`, `addIntentListener`) all exist in FDC3 2.0, so an adapter for a 2.0 container would implement the same `InteropService` without touching components.

## 1. Apps (app directory entries)
There is one Angular application (`shell`). Blotter and Detail are libraries, each also served full-page without shell chrome at its own route. Each Sail tab is a separate instance with its own `getAgent()` connection, identified by the AppD entry whose URL it loaded (SPEC NFR-ARCH1, DECISIONS #10).

| appId | Title | URL (dev) | Broadcasts | Listens for | Raises | Handles intents |
|---|---|---|---|---|---|---|
| `poc-blotter` | Blotter | `http://localhost:4200/apps/blotter` | `fdc3.instrument` (row select) | none | `ViewChart` (row menu) | none |
| `poc-detail` | Instrument Detail | `http://localhost:4200/apps/detail` | none | `fdc3.instrument` | none | `ViewChart` (context `fdc3.instrument`) |
| `poc-shell` | Workspace Shell | `http://localhost:4200/` | `fdc3.instrument` (a plan's `fdc3Action`; row select in an embedded `blotter` module) | `fdc3.instrument` (sent to the agent as context) | `ViewChart` (row menu in an embedded `blotter` module) | none |

Modules the shell renders inside itself share the shell's connection and therefore act as `poc-shell`. The shell is never a `ViewChart` handler; Detail is the only one.

The app directory JSON lives in `specs/appd.json` (AppD v2) and is served by the Go API at `GET /appd/v2/apps`. In Sail, open the ⋯ settings, choose Directories, add `http://localhost:8080/appd/v2/apps`, and enable it.

## 2. Contexts
Use standard types only.

```json
{
  "type": "fdc3.instrument",
  "name": "Apple Inc.",
  "id": { "ticker": "AAPL" }
}
```
- `id.ticker` is required and upper-case. `name` is optional. Extra fields from other apps are ignored.
- No custom context types in this POC.

## 3. Channels
- User channels only (Sail's color linking). Broadcasting apps call `fdc3.broadcast(ctx)`.
- Detail and Shell call `fdc3.addContextListener("fdc3.instrument", handler)`. A broadcaster does not receive its own broadcast.
- No app channels or private channels (out of scope).

## 4. Intents
| Intent | Context | Raiser | Handler | Result |
|---|---|---|---|---|
| `ViewChart` | `fdc3.instrument` | Blotter or Shell (row context menu) | Detail | void. Detail activates its chart tab for `id.ticker` |

- **FDC3 adapter:** if Detail isn't open, Sail launches it from the app directory. If several handlers exist, Sail's resolver UI picks one. The POC registers exactly one. Detail registers its intent listener during startup so a freshly launched instance receives the intent.
- **In-memory adapter:** the raiser posts the intent on the BroadcastChannel. Every open Detail instance handles it and replies with an acknowledgement. `raiseViewChart` resolves on the first acknowledgement and rejects with `Error('NoAppsFound')` (the FDC3 `ResolveError` name) if none arrives within 1000 ms. It cannot launch Detail.

## 5. Adapter interface (Angular)
All app code depends on this interface, not on FDC3 directly.

```ts
export type InteropStatus = 'connecting' | 'fdc3' | 'in-memory';

export interface InstrumentRef { ticker: string; name?: string }

export interface InteropService {
  readonly status: Signal<InteropStatus>;                     // shown by the interop badge
  readonly instrument$: Observable<InstrumentRef>;             // incoming fdc3.instrument
  readonly viewChart$: Observable<string>;                     // ViewChart tickers; subscribing registers the handler
  broadcastInstrument(ref: InstrumentRef): Promise<void>;
  raiseViewChart(ticker: string): Promise<void>;               // rejects with Error('NoAppsFound') when nothing handles it
}
export const INTEROP = new InjectionToken<InteropService>('INTEROP');
```
- `provideInterop()` supplies `INTEROP` from the `INTEROP_OPTIONS` token, which the app fills from `RUNTIME_CONFIG.interop` (DECISIONS #29, #30). With `provider: "fdc3"`, status starts at `connecting` and calls `getAgent()` with `connectTimeoutMs` as the timeout (the call is also raced against a timer, so a hanging `getAgent` still falls back). Calls made while connecting wait for the outcome. On success status becomes `fdc3`. On timeout or error it switches to the in-memory implementation, status becomes `in-memory`, and the badge makes that visible. With `provider: "in-memory"`, status is `in-memory` from the start.
- `Fdc3InteropService` is the only code that imports `@finos/fdc3` (lint-enforced, SPEC NFR-ARCH2).
- `InMemoryInteropService` uses `BroadcastChannel('poc-interop')`, so it works across same-origin tabs without Sail.
- An OpenFin or io.Connect adapter would implement this same interface. Neither is **built or run**.

## 6. Test obligations
- **Unit (against `InMemoryInteropService`, FR2/FR4):** a broadcast reaches a second instance; the sender doesn't receive its own broadcast; `ViewChart` reaches a subscribed handler and resolves on its acknowledgement; with no handler, `raiseViewChart` rejects with `NoAppsFound` after 1000 ms (fake timers).
- **Unit (`provideInterop`):** with a fake `getAgent` that resolves, status goes `connecting → fdc3`; with one that hangs past `connectTimeoutMs`, status goes `connecting → in-memory` (fake timers).
- **E2E (Playwright, in-memory adapter):** Blotter and Detail open as two pages in one browser context; selecting a row updates Detail; **View chart** activates Detail's chart tab; a plan with an `fdc3Action` from the shell updates Detail.
- **Manual (Day 2, real Sail):** two tabs on the same channel; record a GIF for the README. This is the only check that needs Sail, and the README says so.
