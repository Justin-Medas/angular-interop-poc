// Theme toggle button (FR11). Its label names the action it will perform, not the current state (accessibility.md §5).
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PocButton } from '@poc/ui';
import { ThemeService } from './theme.service';

/** Button in the shell header that flips between dark and light themes. */
@Component({
  selector: 'poc-theme-toggle',
  imports: [PocButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  private readonly themes = inject(ThemeService);
  /** The theme a click switches to; used in the button label. */
  protected readonly target = computed(() => (this.themes.theme() === 'dark' ? 'light' : 'dark'));

  /** Delegates to ThemeService, which owns persistence and the data-theme attribute. */
  protected toggle(): void {
    this.themes.toggle();
  }
}
