// Root component (FR10, FR11). Shows the config error screen instead of the router when /config.json is invalid, so
// the app never starts half-configured. Creating ThemeService here applies the theme on every route, including /apps/*.
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfigErrorScreen } from './config/config-error';
import { RuntimeConfigStore } from './config/runtime-config';
import { ThemeService } from './config/theme.service';

/** App root: either the routed UI or, if configuration failed, the error screen. */
@Component({
  selector: 'poc-root',
  imports: [RouterOutlet, ConfigErrorScreen],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** Outcome of loading /config.json; the template branches on its errors. */
  protected readonly config = inject(RuntimeConfigStore);

  constructor() {
    inject(ThemeService); // applies data-theme to <html> for every route
  }
}
