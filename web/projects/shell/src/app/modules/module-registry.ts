// Maps a plan's `module` name to a lazy loader (FR8). Adding a module is one entry here; a name with no entry
// renders the "unknown module" error card, which is also the safe behavior if the schema grows ahead of the shell.
import { Type } from '@angular/core';

/** Loads a module component on demand so its code stays out of the initial bundle (FR8). */
export type ModuleLoader = () => Promise<Type<unknown>>;

/** The modules the shell can render. Each component takes one required `payload` input. */
export const MODULE_LOADERS: Readonly<Record<string, ModuleLoader>> = {
  none: () => import('./none-module').then((m) => m.NoneModule),
  blotter: () => import('./blotter-module').then((m) => m.BlotterModule),
  'instrument-detail': () =>
    import('./instrument-detail-module').then((m) => m.InstrumentDetailModule),
  'price-chart': () => import('./price-chart-module').then((m) => m.PriceChartModule),
  'watchlist-movers': () =>
    import('./watchlist-movers-module').then((m) => m.WatchlistMoversModule),
  compare: () => import('./compare-module').then((m) => m.CompareModule),
};

/** Looks up a loader by own property only, so names like `constructor` are unknown rather than inherited. */
export function loaderFor(name: string): ModuleLoader | undefined {
  return Object.hasOwn(MODULE_LOADERS, name) ? MODULE_LOADERS[name] : undefined;
}
