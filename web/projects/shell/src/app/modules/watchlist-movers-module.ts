// The `watchlist-movers` module (FR13): ranks the watchlist by change %. `both` shows the top N gainers and the
// top N losers. Ranking happens here, not in the API, because the agent's tool already returns the same quotes.
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PocCard } from '@poc/ui';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { loadFor, Quote, signed, signedPct } from './load';

/** What the plan asks for. */
interface MoversPayload {
  direction: 'up' | 'down' | 'both';
  limit: number;
}

/** Top `limit` gainers (best first) and losers (worst first); a list is null when the direction excludes it. */
function rank(quotes: Quote[], { direction, limit }: MoversPayload) {
  const byChange = [...quotes].sort((a, b) => b.changePct - a.changePct);
  return {
    gainers: direction === 'down' ? null : byChange.filter((q) => q.changePct > 0).slice(0, limit),
    losers:
      direction === 'up'
        ? null
        : byChange
            .filter((q) => q.changePct < 0)
            .reverse()
            .slice(0, limit),
  };
}

/** Ranked lists of gainers and losers. Signs are written out so direction never relies on color. */
@Component({
  selector: 'poc-watchlist-movers-module',
  imports: [PocCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <poc-card heading="Watchlist movers">
      @let s = state();
      @if (s.kind === 'ok') {
        @let r = rank(s.data, payload());
        @if (r.gainers; as g) {
          <h3>Gainers</h3>
          <ul data-testid="gainers">
            @for (q of g; track q.symbol) {
              <li>{{ q.symbol }} {{ signedPct(q.changePct) }} ({{ signed(q.change) }})</li>
            }
          </ul>
        }
        @if (r.losers; as l) {
          <h3>Losers</h3>
          <ul data-testid="losers">
            @for (q of l; track q.symbol) {
              <li>{{ q.symbol }} {{ signedPct(q.changePct) }} ({{ signed(q.change) }})</li>
            }
          </ul>
        }
      } @else if (s.kind === 'error') {
        <p role="alert">Could not load quotes.</p>
      } @else {
        <p>Loading…</p>
      }
    </poc-card>
  `,
})
export class WatchlistMoversModule {
  private readonly http = inject(HttpClient);
  private readonly api = inject(RUNTIME_CONFIG).apiBaseUrl;

  /** The plan's payload. */
  readonly payload = input.required<MoversPayload>();

  protected readonly rank = rank;
  protected readonly signed = signed;
  protected readonly signedPct = signedPct;

  protected readonly state = loadFor(this.payload, () =>
    this.http.get<Quote[]>(`${this.api}/quotes`),
  );
}
