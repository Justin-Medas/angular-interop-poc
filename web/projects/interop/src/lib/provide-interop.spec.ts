import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { INTEROP } from './interop.service';
import { InMemoryInteropService } from './in-memory-interop.service';
import { INTEROP_OPTIONS, provideInterop } from './provide-interop';

describe('provideInterop', () => {
  it('FR2 provides the in-memory adapter for provider in-memory', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: INTEROP_OPTIONS, useValue: { provider: 'in-memory', connectTimeoutMs: 3000 } },
        provideInterop(),
      ],
    });
    const interop = TestBed.inject(INTEROP);
    expect(interop).toBeInstanceOf(InMemoryInteropService);
    expect(interop.status()).toBe('in-memory');
  });
});
