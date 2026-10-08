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
  protected readonly environment = computed(() => this.store.config()?.environment ?? '');
}
