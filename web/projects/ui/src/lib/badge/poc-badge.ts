// Status badge (FR14: source, interop and environment badges). Color is never the only signal: `tone`
// also changes the border style, and `label` gives assistive tech the long form of an abbreviated `text`.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Small inline status pill. Inputs: `text` (shown), `label` (screen-reader long form), `tone` (neutral, ok, warn, danger). */
@Component({
  selector: 'poc-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="tone()">
      @if (label()) {
        <span aria-hidden="true">{{ text() }}</span>
        <span class="sr-only">{{ label() }}</span>
      } @else {
        {{ text() }}
      }
    </span>
  `,
  styleUrl: './poc-badge.scss',
})
export class PocBadge {
  /** The visible text. */
  text = input.required<string>();
  /** Long form for assistive tech when `text` is abbreviated. */
  label = input<string>();
  /** Semantic emphasis; mapped to tokens in the stylesheet, never to raw colors. */
  tone = input<'neutral' | 'ok' | 'warn' | 'danger'>('neutral');
}
