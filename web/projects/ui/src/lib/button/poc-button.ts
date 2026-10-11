// Button in the design system (specs/design-tokens.md; accessibility.md §5). A wrapper element around a native
// <button>, so keyboard, focus and disabled behavior are the browser's. Feature code uses this, never a raw <button>.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Native button with token styling. `busy` disables it and sets aria-busy, so a pending request cannot be double-submitted. */
@Component({
  selector: 'poc-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="variant()"
      [type]="type()"
      [disabled]="disabled() || busy()"
      [attr.aria-pressed]="pressed()"
      [attr.aria-busy]="busy() ? 'true' : null"
    >
      <ng-content />
    </button>
  `,
  styleUrl: './poc-button.scss',
})
export class PocButton {
  /** `primary` is the filled accent button; `secondary` is the outlined one. */
  variant = input<'primary' | 'secondary'>('primary');
  /** Native button type. Defaults to `button` so it never submits a form by accident. */
  type = input<'button' | 'submit'>('button');
  /** Disables the button. */
  disabled = input(false);
  /** An action is in flight: disables the button and exposes aria-busy. */
  busy = input(false);
  /** Makes it a toggle button; leave null for a plain button. */
  pressed = input<boolean | null>(null);
}
