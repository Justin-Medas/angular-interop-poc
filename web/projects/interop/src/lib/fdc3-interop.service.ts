// FDC3 adapter (fdc3-contract.md §2, §3; FR2, FR3, FR4): maps InteropService calls onto a Desktop Agent.
// It is handed an agent already connected; locating one, timing out and falling back is FailoverInteropService's job.
// This file and get-agent.ts are the only code that knows `@finos/fdc3` (NFR-ARCH2).
import { signal } from '@angular/core';
import type { Context, DesktopAgent, Listener } from '@finos/fdc3';
import { Observable } from 'rxjs';
import { InstrumentRef, InteropService, InteropStatus } from './interop.service';

/** The FDC3 context type for an instrument (fdc3-contract.md §2). */
const INSTRUMENT = 'fdc3.instrument';

/** Reads a ticker from an fdc3.instrument context (fdc3-contract.md §2); other id shapes are ignored. */
function toRef(ctx: Context): InstrumentRef | undefined {
  const ticker = (ctx.id as { ticker?: unknown } | undefined)?.ticker;
  if (typeof ticker !== 'string') return undefined;
  const ref: InstrumentRef = { ticker: ticker.toUpperCase() };
  if (ctx.name !== undefined) ref.name = ctx.name;
  return ref;
}

/** Wraps a listener registration as an Observable; unsubscribing removes the listener, even if it is still registering. */
function fromListener(
  register: (emit: (ctx: Context) => void) => Promise<Listener>,
): Observable<Context> {
  return new Observable<Context>((subscriber) => {
    const listener = register((ctx) => subscriber.next(ctx));
    listener.catch((e: unknown) => subscriber.error(e));
    return () => void listener.then((l) => l.unsubscribe()).catch(() => undefined);
  });
}

/** InteropService backed by a real FDC3 Desktop Agent. The only place that talks to `@finos/fdc3`. */
export class Fdc3InteropService implements InteropService {
  readonly status = signal<InteropStatus>('fdc3').asReadonly();

  readonly instrument$ = new Observable<InstrumentRef>((subscriber) =>
    fromListener((emit) => this.agent.addContextListener(INSTRUMENT, emit)).subscribe({
      next: (ctx) => {
        const ref = toRef(ctx);
        if (ref) subscriber.next(ref);
      },
      error: (e: unknown) => subscriber.error(e),
    }),
  );

  /** Subscribing registers the ViewChart intent listener. */
  readonly viewChart$ = new Observable<string>((subscriber) =>
    fromListener((emit) => this.agent.addIntentListener('ViewChart', emit)).subscribe({
      next: (ctx) => {
        const ref = toRef(ctx);
        if (ref) subscriber.next(ref.ticker);
      },
      error: (e: unknown) => subscriber.error(e),
    }),
  );

  /** @param agent a connected Desktop Agent, from `getAgent()`. */
  constructor(private readonly agent: DesktopAgent) {}

  /** Broadcasts on the app's current channel; a missing name is omitted rather than sent as undefined. */
  broadcastInstrument(ref: InstrumentRef): Promise<void> {
    return this.agent.broadcast({
      type: INSTRUMENT,
      ...(ref.name !== undefined && { name: ref.name }),
      id: { ticker: ref.ticker },
    });
  }

  /** Raises the `ViewChart` intent; the Desktop Agent resolves the handler (and may launch Detail, §4). */
  async raiseViewChart(ticker: string): Promise<void> {
    await this.agent.raiseIntent('ViewChart', { type: INSTRUMENT, id: { ticker } });
  }
}
