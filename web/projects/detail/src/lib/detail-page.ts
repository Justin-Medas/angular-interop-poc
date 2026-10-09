import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { INTEROP } from '@poc/interop';
import { PocButton, PocChartPoint, PocLineChart, PocTabs } from '@poc/ui';
import { catchError, map, merge, of, startWith, switchMap, tap } from 'rxjs';
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

type HistoryState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; points: PocChartPoint[] }
  | { kind: 'error' };

type Range = '1D' | '5D' | '1M';

const RANGES: { id: Range; name: string }[] = [
  { id: '1D', name: '1 day' },
  { id: '5D', name: '5 days' },
  { id: '1M', name: '1 month' },
];

@Component({
  selector: 'poc-detail-page',
  imports: [PocTabs, PocButton, PocLineChart],
  templateUrl: './detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPage {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(DETAIL_SETTINGS);
  private readonly interop = inject(INTEROP);

  protected readonly tabs = [
    { id: 'quote', label: 'Quote' },
    { id: 'chart', label: 'Chart' },
  ];
  protected readonly ranges = RANGES;
  protected readonly tab = signal('quote');
  protected readonly range = signal<Range>('1D');
  protected readonly rangeName = computed(() => RANGES.find((r) => r.id === this.range())!.name);
  private readonly ticker = signal<string | null>(null);

  /**
   * FR3 + FR4: both an fdc3.instrument and a ViewChart intent select a ticker; ViewChart also
   * switches to the Chart tab (the tab is state, so focus stays wherever it was).
   * Each new ticker cancels the previous request (switchMap).
   */
  protected readonly state = toSignal(
    merge(
      this.interop.instrument$.pipe(map(({ ticker }) => ticker)),
      this.interop.viewChart$.pipe(tap(() => this.tab.set('chart'))),
    ).pipe(
      tap((ticker) => this.ticker.set(ticker)),
      switchMap((ticker) =>
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

  /** FR12: history loads only while the Chart tab is showing, and refetches on ticker or range change. */
  protected readonly history = toSignal(
    toObservable(
      computed(() =>
        this.tab() === 'chart' ? { ticker: this.ticker(), range: this.range() } : null,
      ),
    ).pipe(
      switchMap((key) =>
        key?.ticker
          ? this.http
              .get<PocChartPoint[]>(
                `${this.settings.apiBaseUrl}/quotes/${encodeURIComponent(key.ticker)}/history`,
                { params: { range: key.range } },
              )
              .pipe(
                map((points): HistoryState => ({ kind: 'ok', points })),
                catchError(() => of<HistoryState>({ kind: 'error' })),
                startWith<HistoryState>({ kind: 'loading' }),
              )
          : of<HistoryState>({ kind: 'idle' }),
      ),
    ),
    { initialValue: { kind: 'idle' } as HistoryState },
  );
}
