// The workspace (FR8, FR14, FR17): command bar, the agent's rationale in a polite live region, and the rendered plan.
// This component owns the request lifecycle; PlanView and ModuleSlot only render.
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { INTEROP } from '@poc/interop';
import { PocCard } from '@poc/ui';
import { TimeoutError } from 'rxjs';
import { AgentClient } from '../agent/agent-client';
import { WorkspacePlanResponse } from '../agent/plan';
import { CommandBar } from './command-bar';
import { PlanView } from './plan-view';

/** Where the agent's plan renders. */
@Component({
  selector: 'poc-workspace',
  imports: [CommandBar, PlanView, PocCard],
  templateUrl: './workspace.html',
  styleUrl: './workspace.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {
  private readonly agent = inject(AgentClient);
  private readonly interop = inject(INTEROP);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly errorId = 'workspace-error';
  protected readonly pending = signal(false);
  protected readonly response = signal<WorkspacePlanResponse | null>(null);
  /** Request failure (FR14); the text is fixed here, never copied from the server. */
  protected readonly error = signal<string | null>(null);
  /** Set when the fdc3Action broadcast failed, so the user knows other windows did not follow (FR17). */
  protected readonly syncFailed = signal(false);

  /** Sends the prompt unless a request is already in flight (the button is disabled, but Enter must not double-send). */
  protected submit(prompt: string): void {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set(null);
    this.agent
      .selectModule(prompt)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.pending.set(false);
          this.syncFailed.set(false);
          this.response.set(response);
        },
        error: (e: unknown) => {
          this.pending.set(false);
          this.error.set(
            e instanceof TimeoutError
              ? 'The request took too long. Try again.'
              : 'Could not get a plan. Try again.',
          );
        },
      });
  }

  /** FR17: the plan's one side effect runs only after every module is on screen. */
  protected onRendered(): void {
    const action = this.response()?.plan.fdc3Action;
    if (!action) return;
    this.interop
      .broadcastInstrument({ ticker: action.ticker })
      .catch(() => this.syncFailed.set(true));
  }
}
