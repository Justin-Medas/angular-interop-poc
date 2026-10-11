// Public API of @poc/interop: the only import path feature code may use (NFR-ARCH2).
// The failover and get-agent internals are deliberately not exported.

export {
  INTEROP,
  type InstrumentRef,
  type InteropService,
  type InteropStatus,
} from './lib/interop.service';
export { InMemoryInteropService } from './lib/in-memory-interop.service';
export { INTEROP_OPTIONS, provideInterop, type InteropOptions } from './lib/provide-interop';
export { Fdc3InteropService } from './lib/fdc3-interop.service';
