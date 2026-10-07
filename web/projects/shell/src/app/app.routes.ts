import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'apps/blotter',
    loadComponent: () => import('@poc/blotter').then((m) => m.BlotterPage),
  },
  {
    path: 'apps/detail',
    loadComponent: () => import('@poc/detail').then((m) => m.DetailPage),
  },
];
