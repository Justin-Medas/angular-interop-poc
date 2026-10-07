import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
  text = input.required<string>();
  /** Long form for assistive tech when `text` is abbreviated. */
  label = input<string>();
  tone = input<'neutral' | 'ok' | 'warn' | 'danger'>('neutral');
}
