import {
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { FailoverInteropService } from './failover-interop.service';
import { InMemoryInteropService } from './in-memory-interop.service';
import { INTEROP } from './interop.service';

/** The `interop` block of /config.json. The app provides it from RUNTIME_CONFIG; the library never imports the shell. */
export interface InteropOptions {
  provider: 'fdc3' | 'in-memory';
  connectTimeoutMs: number;
}

export const INTEROP_OPTIONS = new InjectionToken<InteropOptions>('INTEROP_OPTIONS');

/** Provides INTEROP: the in-memory adapter, or an FDC3 agent that fails over to it (fdc3-contract.md §5). */
export function provideInterop(): EnvironmentProviders {
  return makeEnvironmentProviders([
    InMemoryInteropService,
    FailoverInteropService,
    {
      provide: INTEROP,
      useFactory: () =>
        inject(INTEROP_OPTIONS).provider === 'fdc3'
          ? inject(FailoverInteropService)
          : inject(InMemoryInteropService),
    },
  ]);
}
