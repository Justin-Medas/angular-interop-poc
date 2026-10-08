import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigErrorScreen } from './config/config-error';
import { RuntimeConfigStore } from './config/runtime-config';
import { ThemeService } from './config/theme.service';

@Component({
  selector: 'poc-root',
  imports: [RouterOutlet, ConfigErrorScreen],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly config = inject(RuntimeConfigStore);

  constructor() {
    inject(ThemeService); // applies data-theme to <html> for every route
  }
}
