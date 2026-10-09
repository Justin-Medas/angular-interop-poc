import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { INTEROP } from '@poc/interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { DETAIL_SETTINGS } from './detail-settings';

interface Quote {
  symbol: string;
  name: string;
  last: number;
  change: number;
  changePct: number;
  currency: string;
}

type QuoteState =
  | { kind: 'empty' }
  | { kind: 'loading'; ticker: string }
  | { kind: 'ok'; quote: Quote }
  | { kind: 'unknown'; ticker: string }
  | { kind: 'error'; ticker: string };

@Component({
  selector: 'poc-detail-page',
  templateUrl: './detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPage {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(DETAIL_SETTINGS);

  /** FR3: each incoming instrument cancels the previous request (switchMap) and shows the newest quote. */
  protected readonly state = toSignal(
    inject(INTEROP).instrument$.pipe(
      switchMap(({ ticker }) =>
        this.http
          .get<Quote>(`${this.settings.apiBaseUrl}/quotes/${encodeURIComponent(ticker)}`)
          .pipe(
            map((quote): QuoteState => ({ kind: 'ok', quote })),
            catchError((e: HttpErrorResponse) =>
              of<QuoteState>({ kind: e.status === 404 ? 'unknown' : 'error', ticker }),
            ),
            startWith<QuoteState>({ kind: 'loading', ticker }),
          ),
      ),
    ),
    { initialValue: { kind: 'empty' } as QuoteState },
  );
}
