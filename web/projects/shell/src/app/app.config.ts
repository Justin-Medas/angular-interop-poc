import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { INTEROP_OPTIONS, provideInterop } from '@poc/interop';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideRuntimeConfig, RUNTIME_CONFIG } from './config/runtime-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRuntimeConfig(),
    { provide: INTEROP_OPTIONS, useFactory: () => inject(RUNTIME_CONFIG).interop },
    provideInterop(),
    provideRouter(routes),
  ],
};
