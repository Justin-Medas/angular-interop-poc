// Browser entry point. Config is loaded by an app initializer in app.config.ts, so by the time App renders either
// a valid config exists or the config error screen is shown (FR10). Excluded from coverage: wiring only (testing.md §4).
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
