// The `blotter` module (FR13): an embedded, read-only watchlist table, optionally filtered by `symbols`.
// Not the /apps/blotter page: that one owns a <main>/<h1> and broadcasts selections (DECISIONS #40).
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PocCard, PocColumn, PocDataTable } from '@poc/ui';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { loadFor, Quote } from './load';

/** Watchlist table. The heading is always present so the renderer can focus it before data arrives (FR8). */
@Component({
  selector: 'poc-blotter-module',
  imports: [PocCard, PocDataTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <poc-card heading="Watchlist">
      @let s = state();
      @if (s.kind === 'ok') {
        <poc-data-table [rows]="s.data" [columns]="columns" rowId="symbol" />
      } @else if (s.kind === 'error') {
        <p role="alert">Could not load quotes.</p>
      } @else {
        <p>Loading…</p>
      }
    </poc-card>
  `,
})
export class BlotterModule {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** The plan's payload; `null` symbols means the whole watchlist. */
  readonly payload = input.required<{ symbols: string[] | null }>();

  protected readonly columns: PocColumn<Quote>[] = [
    { key: 'symbol', header: 'Symbol', pinned: 'left' },
    { key: 'last', header: 'Last', format: 'number' },
    { key: 'change', header: 'Chg', format: 'signed' },
    { key: 'changePct', header: 'Chg %', format: 'percent' },
  ];

  protected readonly state = loadFor(this.payload, ({ symbols }) =>
    this.http.get<Quote[]>(`${this.api}/quotes`, {
      params: symbols ? { symbols: symbols.join(',') } : {},
    }),
  );
}
