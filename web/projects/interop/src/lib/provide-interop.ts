import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { InMemoryInteropService } from './in-memory-interop.service';
import { INTEROP } from './interop.service';

/** The `interop` block of /config.json. The app provides it from RUNTIME_CONFIG; the library never imports the shell. */
export interface InteropOptions {
  provider: 'fdc3' | 'in-memory';
  connectTimeoutMs: number;
}

export const INTEROP_OPTIONS = new InjectionToken<InteropOptions>('INTEROP_OPTIONS');

/** Provides INTEROP. Only the in-memory adapter exists so far; the fdc3 provider follows with Fdc3InteropService. */
export function provideInterop(): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: INTEROP, useClass: InMemoryInteropService }]);
}
