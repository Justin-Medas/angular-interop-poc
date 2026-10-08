import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { BLOTTER_SETTINGS, BlotterSettings } from '@poc/blotter';
import { RUNTIME_CONFIG, RuntimeConfig } from './config/runtime-config';

/** The blotter library never imports the shell, so the shell hands it the config it needs. */
export const blotterSettings = (config: RuntimeConfig): BlotterSettings => ({
  apiBaseUrl: config.apiBaseUrl,
  pollIntervalMs: config.quotes?.pollIntervalMs ?? 2000,
});

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
    providers: [
      { provide: BLOTTER_SETTINGS, useFactory: () => blotterSettings(inject(RUNTIME_CONFIG)) },
    ],
    loadComponent: () => import('@poc/blotter').then((m) => m.BlotterPage),
  },
  {
    path: 'apps/detail',
    loadComponent: () => import('@poc/detail').then((m) => m.DetailPage),
  },
  {
    path: 'dev/ui-gallery',
    loadComponent: () => import('./dev/ui-gallery').then((m) => m.UiGallery),
  },
];
