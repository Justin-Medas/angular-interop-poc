// Command bar (FR14): the one input where the user asks the agent for a workspace. A labelled search region
// (accessibility.md §4); Enter submits, and the button is disabled with aria-busy while a request is pending (§5).
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PocButton } from '@poc/ui';

/** Counter for unique input ids. */
let nextId = 0;

/** Prompt form. It trims and drops empty input; sending and state belong to the parent. */
@Component({
  selector: 'poc-command-bar',
  imports: [PocButton],
  templateUrl: './command-bar.html',
  styleUrl: './command-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandBar {
  /** True while a request is in flight; disables the button. */
  readonly pending = input(false);
  /** Id of the element describing the current error, linked with aria-describedby (accessibility.md §4). */
  readonly describedBy = input<string | null>(null);
  /** Emits the trimmed, non-empty prompt. */
  readonly submitted = output<string>();

  protected readonly inputId = `poc-command-${nextId++}`;

  /** Handles the form's native submit, which both Enter and the button trigger. */
  protected onSubmit(event: Event, box: HTMLInputElement): void {
    event.preventDefault();
    const prompt = box.value.trim();
    if (prompt) this.submitted.emit(prompt);
  }
}
