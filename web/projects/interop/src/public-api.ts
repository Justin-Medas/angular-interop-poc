/*
 * Public API Surface of interop
 */

export {
  INTEROP,
  type InstrumentRef,
  type InteropService,
  type InteropStatus,
} from './lib/interop.service';
export { InMemoryInteropService } from './lib/in-memory-interop.service';
export { INTEROP_OPTIONS, provideInterop, type InteropOptions } from './lib/provide-interop';
export { Fdc3InteropService } from './lib/fdc3-interop.service';
