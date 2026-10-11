// Routes (NFR-ARCH1, FR8). `/` is the workspace with shell chrome. `/apps/blotter` and `/apps/detail` render a
// micro-app full page with no chrome: those are the URLs FDC3 Sail opens. All of them are lazy, so AG Grid and
// the feature code are not in the initial bundle.
import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import type { BlotterSettings } from '@poc/blotter';
import { RUNTIME_CONFIG, RuntimeConfig } from './config/runtime-config';

/** The blotter library never imports the shell, so the shell hands it the config it needs. */
/** Maps runtime config to the blotter's settings; a missing `quotes` block falls back to the 2 s default poll. */
export const blotterSettings = (config: RuntimeConfig): BlotterSettings => ({
  apiBaseUrl: config.apiBaseUrl,
  pollIntervalMs: config.quotes?.pollIntervalMs ?? 2000,
});

/** The shell's route table. `/dev/ui-gallery` is the page visual tests snapshot. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./layout/shell-layout').then((m) => m.ShellLayout),
    children: [
      { path: '', loadComponent: () => import('./layout/workspace').then((m) => m.Workspace) },
    ],
  },
  {
    path: 'apps/blotter',
    // Import the library lazily, even for its token: a static import would pull AG Grid into the initial bundle.
    loadChildren: async () => {
      const { BLOTTER_SETTINGS, BlotterPage } = await import('@poc/blotter');
      return [
        {
          path: '',
          component: BlotterPage,
          providers: [
            {
              provide: BLOTTER_SETTINGS,
              useFactory: () => blotterSettings(inject(RUNTIME_CONFIG)),
            },
          ],
        },
      ];
    },
  },
  {
    path: 'apps/detail',
    loadChildren: async () => {
      const { DETAIL_SETTINGS, DetailPage } = await import('@poc/detail');
      return [
        {
          path: '',
          component: DetailPage,
          providers: [
            {
              provide: DETAIL_SETTINGS,
              useFactory: () => ({ apiBaseUrl: inject(RUNTIME_CONFIG).apiBaseUrl }),
            },
          ],
        },
      ];
    },
  },
  {
    path: 'dev/ui-gallery',
    loadComponent: () => import('./dev/ui-gallery').then((m) => m.UiGallery),
  },
];
