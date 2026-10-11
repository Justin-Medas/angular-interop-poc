// Own SVG line chart (FR12, FR13; DECISIONS #11: no chart library). It draws one polyline scaled to the data
// and carries the accessible alternatives required by accessibility.md §5: a text summary on the image and a
// visually hidden table with every point.
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** One sample: an ISO timestamp and a price. Matches `PricePoint` in openapi.yaml. */
export interface PocChartPoint {
  t: string;
  price: number;
}

/** Fixed drawing space; the SVG scales to its container through the viewBox, so no resize handling is needed. */
const W = 600;
const H = 200;
/** Margin inside the viewBox so the stroke is not clipped at the extremes. */
const PAD = 8;

/** SVG line chart with a text summary and a visually hidden data table (accessibility.md §5). */
@Component({
  selector: 'poc-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (points().length) {
      <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" role="img" [attr.aria-label]="summary()">
        <polyline
          [attr.points]="path()"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <table class="visually-hidden">
        <caption>
          {{
            title()
          }}
        </caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          @for (p of points(); track p.t) {
            <tr>
              <td>{{ p.t }}</td>
              <td>{{ p.price.toFixed(2) }}</td>
            </tr>
          }
        </tbody>
      </table>
    } @else {
      <p>No data for {{ title() }}</p>
    }
  `,
  styleUrl: './poc-line-chart.scss',
})
export class PocLineChart {
  /** Samples, oldest first. An empty list renders a "no data" message instead of a chart. */
  points = input.required<PocChartPoint[]>();
  /** What the chart shows, e.g. "AAPL, 1 day". */
  title = input.required<string>();

  protected readonly w = W;
  protected readonly h = H;

  /** SVG `points` attribute. Prices are scaled to the min–max span (`|| 1` stops a flat series dividing by zero; it draws a flat line along the bottom); y is flipped because SVG grows downward. */
  protected readonly path = computed(() => {
    const pts = this.points();
    const prices = pts.map((p) => p.price);
    const min = Math.min(...prices);
    const span = Math.max(...prices) - min || 1;
    const step = pts.length > 1 ? (W - 2 * PAD) / (pts.length - 1) : 0;
    return pts
      .map((p, i) => `${PAD + i * step},${H - PAD - ((p.price - min) / span) * (H - 2 * PAD)}`)
      .join(' ');
  });

  /** The image's accessible name: first and last price and the move, so the trend is available without seeing the line. */
  protected readonly summary = computed(() => {
    const pts = this.points();
    const first = pts[0].price;
    const last = pts[pts.length - 1].price;
    const pct = Math.abs(((last - first) / first) * 100).toFixed(2);
    const move = last < first ? `down −${pct}%` : `up ${pct}%`;
    return `${this.title()}: ${first.toFixed(2)} to ${last.toFixed(2)}, ${move}`;
  });
}
