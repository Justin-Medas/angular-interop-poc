import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PocButton } from '@poc/ui';
import { ThemeService } from './theme.service';

@Component({
  selector: 'poc-theme-toggle',
  imports: [PocButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  private readonly themes = inject(ThemeService);
  protected readonly target = computed(() => (this.themes.theme() === 'dark' ? 'light' : 'dark'));

  protected toggle(): void {
    this.themes.toggle();
  }
}
