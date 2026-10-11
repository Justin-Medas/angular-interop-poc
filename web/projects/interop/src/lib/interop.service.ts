// The interop contract: the one surface app code depends on (fdc3-contract.md §5; FR2, FR3, FR4).
// Components inject INTEROP and never touch window.fdc3, so the transport (Sail, OpenFin, BroadcastChannel)
// is a provider choice, not a code change.
import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';

/** Which transport is live; the shell's interop badge shows it. `connecting` is only seen while a Desktop Agent is being located. */
export type InteropStatus = 'connecting' | 'fdc3' | 'in-memory';

/** The part of an `fdc3.instrument` context this app uses: a ticker and an optional display name. */
export interface InstrumentRef {
  ticker: string;
  name?: string;
}

/** The only interop surface app code depends on (specs/fdc3-contract.md §5). */
export interface InteropService {
  /** Shown by the interop badge. */
  readonly status: Signal<InteropStatus>;
  /** Incoming fdc3.instrument contexts. */
  readonly instrument$: Observable<InstrumentRef>;
  /** ViewChart tickers. Subscribing registers the handler. */
  readonly viewChart$: Observable<string>;
  /** Sends an `fdc3.instrument` context (FR2) to every other app on the channel. */
  broadcastInstrument(ref: InstrumentRef): Promise<void>;
  /** Rejects with Error('NoAppsFound') when nothing handles the intent. */
  raiseViewChart(ticker: string): Promise<void>;
}

/** Injection token for the active InteropService; provided by `provideInterop()`. */
export const INTEROP = new InjectionToken<InteropService>('INTEROP');
