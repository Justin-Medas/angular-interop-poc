import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopAgent } from '@finos/fdc3';
import { Fdc3InteropService } from './fdc3-interop.service';
import { FailoverInteropService } from './failover-interop.service';
import { GET_AGENT } from './get-agent';
import { INTEROP } from './interop.service';
import { InMemoryInteropService } from './in-memory-interop.service';
import { INTEROP_OPTIONS, provideInterop } from './provide-interop';

const OPTIONS = { provider: 'fdc3', connectTimeoutMs: 3000 } as const;

function setup(getAgent: () => Promise<DesktopAgent>, options = OPTIONS) {
  TestBed.configureTestingModule({
    providers: [
      { provide: INTEROP_OPTIONS, useValue: options },
      { provide: GET_AGENT, useValue: getAgent },
      provideInterop(),
    ],
  });
  return TestBed.inject(INTEROP);
}

const agentDouble = () =>
  ({
    broadcast: vi.fn(() => Promise.resolve()),
    raiseIntent: vi.fn(() => Promise.resolve({})),
    addContextListener: vi.fn(() => Promise.resolve({ unsubscribe: vi.fn() })),
    addIntentListener: vi.fn(() => Promise.resolve({ unsubscribe: vi.fn() })),
  }) as unknown as DesktopAgent & Record<string, ReturnType<typeof vi.fn>>;

describe('provideInterop with provider fdc3', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('FR2 status goes connecting → fdc3 when getAgent resolves', async () => {
    const agent = agentDouble();
    const interop = setup(() => Promise.resolve(agent));
    expect(interop).toBeInstanceOf(FailoverInteropService);
    expect(interop.status()).toBe('connecting');
    await vi.advanceTimersByTimeAsync(0);
    expect(interop.status()).toBe('fdc3');
  });

  it('FR2 status goes connecting → in-memory when getAgent hangs past connectTimeoutMs', async () => {
    const interop = setup(() => new Promise(() => undefined));
    await vi.advanceTimersByTimeAsync(2999);
    expect(interop.status()).toBe('connecting');
    await vi.advanceTimersByTimeAsync(1);
    expect(interop.status()).toBe('in-memory');
  });

  it('FR2 status goes connecting → in-memory when getAgent rejects', async () => {
    const interop = setup(() => Promise.reject(new Error('no agent')));
    await vi.advanceTimersByTimeAsync(0);
    expect(interop.status()).toBe('in-memory');
  });

  it('FR2 broadcasts called while connecting reach the agent once connected', async () => {
    const agent = agentDouble();
    const interop = setup(() => Promise.resolve(agent));
    const done = interop.broadcastInstrument({ ticker: 'AAPL' });
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(agent['broadcast']).toHaveBeenCalledWith({ type: 'fdc3.instrument', id: { ticker: 'AAPL' } });
  });

  it('FR4 raiseViewChart and the incoming streams follow the connected agent', async () => {
    const agent = agentDouble();
    const interop = setup(() => Promise.resolve(agent));
    interop.instrument$.subscribe();
    interop.viewChart$.subscribe();
    const raised = interop.raiseViewChart('TSLA');
    await vi.advanceTimersByTimeAsync(0);
    await raised;
    expect(agent['raiseIntent']).toHaveBeenCalledWith('ViewChart', {
      type: 'fdc3.instrument',
      id: { ticker: 'TSLA' },
    });
    expect(agent['addContextListener']).toHaveBeenCalled();
    expect(agent['addIntentListener']).toHaveBeenCalled();
  });

  it('FR2 after falling back, calls use the in-memory adapter', async () => {
    const interop = setup(() => Promise.reject(new Error('no agent')));
    const spy = vi.spyOn(InMemoryInteropService.prototype, 'broadcastInstrument');
    await vi.advanceTimersByTimeAsync(0);
    await interop.broadcastInstrument({ ticker: 'AAPL' });
    expect(spy).toHaveBeenCalledWith({ ticker: 'AAPL' });
    spy.mockRestore();
  });

  it('FR2 a late agent after the timeout is ignored', async () => {
    let resolveAgent: (a: DesktopAgent) => void = () => undefined;
    const interop = setup(() => new Promise((r) => (resolveAgent = r)));
    await vi.advanceTimersByTimeAsync(3000);
    resolveAgent(agentDouble());
    await vi.advanceTimersByTimeAsync(0);
    expect(interop.status()).toBe('in-memory');
  });

  it('FR2 passes connectTimeoutMs to getAgent', async () => {
    const getAgent = vi.fn(() => Promise.resolve(agentDouble()));
    setup(getAgent);
    expect(getAgent).toHaveBeenCalledWith({ timeoutMs: 3000 });
  });

  it('FR2 Fdc3InteropService is the adapter that wraps the agent', () => {
    expect(new Fdc3InteropService(agentDouble()).status()).toBe('fdc3');
  });
});
