# FDC3 Contract

Status: **DRAFT v0.1**. Targets FDC3 2.2 (`@finos/fdc3@2.2.x`) with apps connecting through `getAgent()`.

## 1. Apps (app directory entries)
| appId | Title | URL (dev) | Listens for | Raises | Handles intents |
|---|---|---|---|---|---|
| `poc-blotter` | Blotter | `http://localhost:4200/apps/blotter` | none | `ViewChart` | none |
| `poc-detail` | Instrument Detail | `http://localhost:4200/apps/detail` | `fdc3.instrument` | none | `ViewChart` (context `fdc3.instrument`) |
| `poc-shell` | Workspace Shell | `http://localhost:4200/` | `fdc3.instrument` (to seed agent context) | none | none |

The app directory JSON lives in `specs/appd.json` (AppD v2 records) and is served by the Go API at `GET /appd/v2/apps`. In Sail, open the ⋯ settings, choose Directories, add `http://localhost:8080/appd/v2/apps`, and enable it. For a quick check, Sail settings → Custom Apps (paste URL, pick intents) also works.

## 2. Contexts
Use standard types only.

```json
{
  "type": "fdc3.instrument",
  "name": "Apple Inc.",
  "id": { "ticker": "AAPL" }
}
```
- `id.ticker` is required and upper-case. `name` is optional.
- No custom context types in this POC.

## 3. Channels
- User channels only (the Sail color linking). The Blotter calls `fdc3.broadcast(ctx)` on row select.
- Detail and Shell call `fdc3.addContextListener("fdc3.instrument", handler)`.
- No app channels or private channels (out of scope).

## 4. Intents
| Intent | Context | Raiser | Handler | Result |
|---|---|---|---|---|
| `ViewChart` | `fdc3.instrument` | Blotter (row context menu) | Detail | void. Detail activates its chart tab for `id.ticker` |

Resolution: if several handlers exist, Sail's resolver UI picks one. The POC registers exactly one.

## 5. Adapter interface (Angular)
All app code depends on this interface, not on FDC3 directly.

```ts
export interface InteropService {
  broadcastInstrument(ticker: string, name?: string): Promise<void>;
  instrument$: Observable<{ ticker: string; name?: string }>;   // incoming fdc3.instrument
  raiseViewChart(ticker: string): Promise<void>;
  onViewChart(handler: (ticker: string) => void): void;
  readonly connected: Signal<boolean>;
  readonly provider: 'fdc3' | 'in-memory';
}
export const INTEROP = new InjectionToken<InteropService>('INTEROP');
```
- `Fdc3InteropService` wraps `getAgent()` with a 3 s timeout. If it fails, `connected` is set to `false` and the app falls back to in-memory with a visible badge.
- `InMemoryInteropService` uses `BroadcastChannel('poc-interop')`, so it works across same-origin tabs without Sail.
- An OpenFin adapter would implement this same interface. It is **not built**.

## 6. Test obligations
- Adapter unit tests run against `InMemoryInteropService`: broadcast is received by a second instance; ViewChart is routed to the registered handler.
- Manual check in Sail (Day 2): two tabs on the same channel; record a GIF for the README.
