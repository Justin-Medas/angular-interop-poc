// The `instrument-detail` module (FR13): a quote card for `payload.symbol`. It is driven by the plan, not by
// interop, so it works without a linked blotter (DECISIONS #40).
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PocCard } from '@poc/ui';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { loadFor, Quote } from './load';
import { QuoteSummary } from './quote-summary';

/** Quote card; 404 is shown as "Unknown instrument" like the detail app (FR3). */
@Component({
  selector: 'poc-instrument-detail-module',
  imports: [PocCard, QuoteSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <poc-card [heading]="payload().symbol">
      @let s = state();
      @if (s.kind === 'ok') {
        <poc-quote-summary [quote]="s.data" />
      } @else if (s.kind === 'error') {
        <p role="alert">
          @if (s.status === 404) {
            Unknown instrument {{ payload().symbol }}
          } @else {
            Could not load {{ payload().symbol }}.
          }
        </p>
      } @else {
        <p>Loading…</p>
      }
    </poc-card>
  `,
})
export class InstrumentDetailModule {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** The plan's payload. */
  readonly payload = input.required<{ symbol: string }>();

  protected readonly state = loadFor(this.payload, ({ symbol }) =>
    this.http.get<Quote>(`${this.api}/quotes/${encodeURIComponent(symbol)}`),
  );
}
