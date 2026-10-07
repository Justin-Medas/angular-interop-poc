import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'poc-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="variant()"
      [type]="type()"
      [disabled]="disabled() || busy()"
      [attr.aria-busy]="busy() ? 'true' : null"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './poc-button.scss',
})
export class PocButton {
  variant = input<'primary' | 'secondary'>('primary');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  busy = input(false);
}
