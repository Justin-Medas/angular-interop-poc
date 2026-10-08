import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryInteropService } from './in-memory-interop.service';
import type { InstrumentRef } from './interop.service';

const created: InMemoryInteropService[] = [];
const make = () => {
  const s = new InMemoryInteropService();
  created.push(s);
  return s;
};
const tick = () => new Promise((r) => setTimeout(r, 20));

afterEach(() => {
  created.splice(0).forEach((s) => s.ngOnDestroy());
  vi.useRealTimers();
});

describe('InMemoryInteropService', () => {
  it('status is in-memory from the start', () => {
    expect(make().status()).toBe('in-memory');
  });

  it('FR2 a broadcast reaches a second instance', async () => {
    const sender = make();
    const receiver = make();
    const seen: InstrumentRef[] = [];
    receiver.instrument$.subscribe((r) => seen.push(r));
    await sender.broadcastInstrument({ ticker: 'AAPL', name: 'Apple Inc.' });
    await tick();
    expect(seen).toEqual([{ ticker: 'AAPL', name: 'Apple Inc.' }]);
  });

  it('FR2 the sender does not receive its own broadcast', async () => {
    const sender = make();
    const other = make();
    const own: InstrumentRef[] = [];
    sender.instrument$.subscribe((r) => own.push(r));
    other.instrument$.subscribe(() => undefined);
    await sender.broadcastInstrument({ ticker: 'MSFT' });
    await tick();
    expect(own).toEqual([]);
  });

  it('FR2 ignores malformed channel messages', async () => {
    const receiver = make();
    const seen: InstrumentRef[] = [];
    receiver.instrument$.subscribe((r) => seen.push(r));
    const raw = new BroadcastChannel('poc-interop');
    raw.postMessage('garbage');
    raw.postMessage({ type: 'instrument', ref: { ticker: 7 } });
    raw.postMessage({ type: 'instrument', ref: { ticker: 'NVDA' } });
    await tick();
    raw.close();
    expect(seen).toEqual([{ ticker: 'NVDA' }]);
  });

  it('FR4 ViewChart reaches a subscribed handler and resolves on its acknowledgement', async () => {
    const raiser = make();
    const handler = make();
    const tickers: string[] = [];
    handler.viewChart$.subscribe((t) => tickers.push(t));
    await expect(raiser.raiseViewChart('TSLA')).resolves.toBeUndefined();
    expect(tickers).toEqual(['TSLA']);
  });

  it('FR4 an unsubscribed handler no longer acknowledges', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const raiser = make();
    const handler = make();
    handler.viewChart$.subscribe().unsubscribe();
    const outcome = raiser.raiseViewChart('TSLA').catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await outcome).toBe('NoAppsFound');
  });

  it('FR4 with no handler, raiseViewChart rejects with NoAppsFound after 1000 ms', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const raiser = make();
    let message = '';
    const p = raiser.raiseViewChart('AAPL').catch((e: Error) => (message = e.message));
    await vi.advanceTimersByTimeAsync(999);
    expect(message).toBe('');
    await vi.advanceTimersByTimeAsync(1);
    await p;
    expect(message).toBe('NoAppsFound');
  });

  it('FR4 ignores acknowledgements for other requests', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const raiser = make();
    const raw = new BroadcastChannel('poc-interop');
    const p = raiser.raiseViewChart('AAPL').catch((e: Error) => e.message);
    raw.postMessage({ type: 'ack', id: 'someone-else' });
    await vi.advanceTimersByTimeAsync(1000);
    raw.close();
    expect(await p).toBe('NoAppsFound');
  });
});
