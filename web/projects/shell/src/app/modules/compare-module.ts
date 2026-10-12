// The `compare` module (FR13): 2-4 quote cards side by side, in the order the plan lists them.
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PocCard } from '@poc/ui';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { loadFor, Quote } from './load';
import { QuoteSummary } from './quote-summary';

/** One outer card (so the module has one h2) with an h3 per instrument. */
@Component({
  selector: 'poc-compare-module',
  imports: [PocCard, QuoteSummary],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--poc-space-4);
    }
  `,
  template: `
    <poc-card heading="Compare">
      @let s = state();
      @if (s.kind === 'ok') {
        <div class="row">
          @for (q of s.data; track q.symbol) {
            <div>
              <h3>{{ q.symbol }}</h3>
              <poc-quote-summary [quote]="q" />
            </div>
          }
        </div>
      } @else if (s.kind === 'error') {
        <p role="alert">Could not load the comparison.</p>
      } @else {
        <p>Loading…</p>
      }
    </poc-card>
  `,
})
export class CompareModule {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** The plan's payload. */
  readonly payload = input.required<{ symbols: string[] }>();

  // The API returns quotes in the order requested (openapi.yaml), so no client-side sort is needed.
  protected readonly state = loadFor(this.payload, ({ symbols }) =>
    this.http.get<Quote[]>(`${this.api}/quotes`, { params: { symbols: symbols.join(',') } }),
  );
}
