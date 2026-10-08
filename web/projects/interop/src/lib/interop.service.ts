import { InjectionToken, Signal } from '@angular/core';
import { Observable } from 'rxjs';

export type InteropStatus = 'connecting' | 'fdc3' | 'in-memory';

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
  broadcastInstrument(ref: InstrumentRef): Promise<void>;
  /** Rejects with Error('NoAppsFound') when nothing handles the intent. */
  raiseViewChart(ticker: string): Promise<void>;
}

export const INTEROP = new InjectionToken<InteropService>('INTEROP');
