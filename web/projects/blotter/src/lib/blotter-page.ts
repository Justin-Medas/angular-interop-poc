import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PocColumn, PocDataTable } from '@poc/ui';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, of, switchMap, tap, timer } from 'rxjs';
import { BLOTTER_SETTINGS } from './blotter-settings';

export interface Quote {
  symbol: string;
  name: string;
  last: number;
  change: number;
  changePct: number;
  volume: number;
  currency: string;
  asOf: string;
}

@Component({
  selector: 'poc-blotter-page',
  imports: [PocDataTable],
  templateUrl: './blotter-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlotterPage {
  private readonly http = inject(HttpClient);
  private readonly settings = inject(BLOTTER_SETTINGS);

  protected readonly columns: PocColumn<Quote>[] = [
    { key: 'symbol', header: 'Symbol', pinned: 'left' },
    { key: 'last', header: 'Last', format: 'number' },
    { key: 'change', header: 'Chg', format: 'signed' },
    { key: 'changePct', header: 'Chg %', format: 'percent' },
  ];
  protected readonly quotes = signal<Quote[]>([]);
  protected readonly failed = signal(false);

  constructor() {
    const { apiBaseUrl, pollIntervalMs } = this.settings;
    // 0 means fetch once. A failed poll shows an alert and the next tick tries again.
    (pollIntervalMs > 0 ? timer(0, pollIntervalMs) : of(0))
      .pipe(
        switchMap(() =>
          this.http.get<Quote[]>(`${apiBaseUrl}/quotes`).pipe(
            tap(() => this.failed.set(false)),
            catchError(() => {
              this.failed.set(true);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.quotes.set(q));
  }
}
