// Shell chrome (FR11, FR14): header with title, environment badge and theme toggle, plus the routed workspace.
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PocBadge } from '@poc/ui';
import { RuntimeConfigStore } from '../config/runtime-config';
import { ThemeToggle } from '../config/theme-toggle';

/** Chrome for the main workspace at `/`. The `/apps/*` routes sit outside it (NFR-ARCH1). */
@Component({
  selector: 'poc-shell-layout',
  imports: [RouterOutlet, PocBadge, ThemeToggle],
  templateUrl: './shell-layout.html',
  styleUrl: './shell-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayout {
  private readonly store = inject(RuntimeConfigStore);
  /** Text for the environment badge (local, docker, ci, …); empty when no config loaded. */
  protected readonly environment = computed(() => this.store.config()?.environment ?? '');
}
