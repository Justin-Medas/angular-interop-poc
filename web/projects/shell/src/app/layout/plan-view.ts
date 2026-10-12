// Renders a WorkspacePlanResponse (FR8, FR14): source and tool-call badges, then the modules in plan order.
// The rationale and the live region live in the parent so the region exists before its text changes.
import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { PocBadge } from '@poc/ui';
import { WorkspacePlanResponse } from '../agent/plan';
import { ModuleSlot } from './module-slot';

/** The plan's metadata strip and module list. Pass a new `response` object for each answer. */
@Component({
  selector: 'poc-plan-view',
  imports: [PocBadge, ModuleSlot],
  templateUrl: './plan-view.html',
  styleUrl: './plan-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanView {
  /** The answer to render. */
  readonly response = input.required<WorkspacePlanResponse>();
  /** Emits once every module of the current response is in the DOM (FR17 waits for this). */
  readonly rendered = output<void>();

  /** Counts finished slots; resets to 0 whenever a new response arrives. */
  private readonly ready = linkedSignal(() => {
    this.response();
    return 0;
  });

  /** FR8: the first module's heading takes focus so keyboard and screen-reader users land on the new content. */
  protected onSlotReady(index: number, slot: HTMLElement): void {
    if (index === 0) {
      // Every module starts with a heading (accessibility.md §4), so this exists; h2 is not focusable until tabindex is set.
      const heading = slot.querySelector<HTMLElement>('h2')!;
      heading.tabIndex = -1;
      heading.focus();
    }
    this.ready.update((n) => n + 1);
    if (this.ready() === this.response().plan.modules.length) this.rendered.emit();
  }
}
