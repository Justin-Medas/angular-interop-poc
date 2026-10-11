// Composition root for interop (fdc3-contract.md §5; DECISIONS #29). `provider` in runtime config picks the
// adapter, so switching transport is a config change. OpenFin would be one more branch here, never a code change in apps.
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
  /** `fdc3` tries a Desktop Agent first; `in-memory` skips straight to the BroadcastChannel adapter. */
  provider: 'fdc3' | 'in-memory';
  /** How long to wait for a Desktop Agent before falling back to in-memory. */
  connectTimeoutMs: number;
}

/** Options token the app provides from RUNTIME_CONFIG.interop. A token, not a config import, so the library stays shell-free. */
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
