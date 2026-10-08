import { Routes } from '@angular/router';

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
