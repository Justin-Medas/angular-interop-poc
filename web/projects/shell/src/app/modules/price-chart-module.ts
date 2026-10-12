// The `price-chart` module (FR13): the line chart for `payload.symbol` over `payload.range`.
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PocCard, PocChartPoint, PocLineChart } from '@poc/ui';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { loadFor } from './load';

/** Long names for the chart's accessible title, matching the detail app. */
const RANGE_NAMES: Record<'1D' | '5D' | '1M', string> = {
  '1D': '1 day',
  '5D': '5 days',
  '1M': '1 month',
};

/** Chart card with no range switch: the plan chose the range. */
@Component({
  selector: 'poc-price-chart-module',
  imports: [PocCard, PocLineChart],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <poc-card [heading]="payload().symbol + ' price chart'">
      @let s = state();
      @if (s.kind === 'ok') {
        <poc-line-chart [points]="s.data" [title]="payload().symbol + ', ' + rangeName()" />
      } @else if (s.kind === 'error') {
        <p role="alert">Could not load chart for {{ payload().symbol }}.</p>
      } @else {
        <p>Loading chart…</p>
      }
    </poc-card>
  `,
})
export class PriceChartModule {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** The plan's payload. */
  readonly payload = input.required<{ symbol: string; range: '1D' | '5D' | '1M' }>();

  protected rangeName(): string {
    return RANGE_NAMES[this.payload().range];
  }

  protected readonly state = loadFor(this.payload, ({ symbol, range }) =>
    this.http.get<PocChartPoint[]>(`${this.api}/quotes/${encodeURIComponent(symbol)}/history`, {
      params: { range },
    }),
  );
}
