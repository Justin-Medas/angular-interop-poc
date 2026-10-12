// Shared plumbing for the FR13 module components: the Quote shape, a load-state helper and number formatting.
// Every module shows loading and failure as visible state (team.md Code Style: nothing is swallowed silently).
import { HttpErrorResponse } from '@angular/common/http';
import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, Observable, of, startWith, switchMap } from 'rxjs';

/** The fields of a quote the modules show (the Quote schema in openapi.yaml). */
export interface Quote {
  symbol: string;
  name: string;
  last: number;
  change: number;
  changePct: number;
  currency: string;
}

/** What a module shows while its data loads. `status` is the HTTP status of a failure (0 for network errors). */
export type Load<T> =
  { kind: 'loading' } | { kind: 'ok'; data: T } | { kind: 'error'; status: number };

/**
 * Turns "payload input -> HTTP request" into a signal of {@link Load}. A new payload cancels the old request
 * (switchMap). Call it in a field initializer: it needs an injection context.
 */
export function loadFor<P, T>(payload: Signal<P>, fetch: (p: P) => Observable<T>): Signal<Load<T>> {
  return toSignal(
    toObservable(payload).pipe(
      switchMap((p) =>
        fetch(p).pipe(
          map((data): Load<T> => ({ kind: 'ok', data })),
          catchError((e: HttpErrorResponse) => of<Load<T>>({ kind: 'error', status: e.status })),
          startWith<Load<T>>({ kind: 'loading' }),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as Load<T> },
  );
}

/** A real minus sign (U+2212), as in the data table: as wide as `+` and read correctly by screen readers. */
const MINUS = '−';

/** Explicit-sign number, so direction is never shown by color alone (accessibility.md). */
export function signed(value: number): string {
  return `${value < 0 ? MINUS : '+'}${Math.abs(value).toFixed(2)}`;
}

/** Explicit-sign percentage, e.g. `+0.85%`. */
export function signedPct(value: number): string {
  return `${signed(value)}%`;
}
