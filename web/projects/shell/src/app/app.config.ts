// Application providers (NFR-ARCH5: one build, every environment). Order matters: runtime config loads first, then
// interop options are derived from it, then interop and routing are provided.
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { INTEROP_OPTIONS, provideInterop } from '@poc/interop';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideRuntimeConfig, RUNTIME_CONFIG } from './config/runtime-config';

/** Root providers for the shell. Differences between environments come only from /config.json. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRuntimeConfig(),
    // Hands the interop block of the config to the library, which must not import the shell (DECISIONS #29).
    { provide: INTEROP_OPTIONS, useFactory: () => inject(RUNTIME_CONFIG).interop },
    provideInterop(),
    provideRouter(routes),
  ],
};
