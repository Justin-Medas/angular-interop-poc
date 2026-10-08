import { describe, expect, it, vi } from 'vitest';
import type { Context, ContextHandler, DesktopAgent, IntentHandler } from '@finos/fdc3';
import { Fdc3InteropService } from './fdc3-interop.service';

/** A DesktopAgent double that records listeners so tests can deliver contexts and intents. */
function fakeAgent() {
  const unsubscribe = vi.fn();
  let contextHandler: ContextHandler | undefined;
  let intentHandler: IntentHandler | undefined;
  const agent = {
    broadcast: vi.fn(() => Promise.resolve()),
    raiseIntent: vi.fn(() => Promise.resolve({})),
    addContextListener: vi.fn((_type: string, h: ContextHandler) => {
      contextHandler = h;
      return Promise.resolve({ unsubscribe });
    }),
    addIntentListener: vi.fn((_intent: string, h: IntentHandler) => {
      intentHandler = h;
      return Promise.resolve({ unsubscribe });
    }),
  };
  return {
    agent: agent as unknown as DesktopAgent,
    spies: agent,
    unsubscribe,
    deliverContext: (ctx: Context) => contextHandler?.(ctx),
    deliverIntent: (ctx: Context) => intentHandler?.(ctx),
  };
}

const flush = () => new Promise((r) => setTimeout(r));

describe('Fdc3InteropService', () => {
  it('FR2 broadcastInstrument sends a standard fdc3.instrument context', async () => {
    const { agent, spies } = fakeAgent();
    await new Fdc3InteropService(agent).broadcastInstrument({ ticker: 'AAPL', name: 'Apple Inc.' });
    expect(spies.broadcast).toHaveBeenCalledWith({
      type: 'fdc3.instrument',
      name: 'Apple Inc.',
      id: { ticker: 'AAPL' },
    });
  });

  it('FR2 broadcastInstrument omits name when the ref has none', async () => {
    const { agent, spies } = fakeAgent();
    await new Fdc3InteropService(agent).broadcastInstrument({ ticker: 'AAPL' });
    expect(spies.broadcast).toHaveBeenCalledWith({ type: 'fdc3.instrument', id: { ticker: 'AAPL' } });
  });

  it('FR3 instrument$ emits refs from incoming fdc3.instrument contexts and upper-cases the ticker', async () => {
    const f = fakeAgent();
    const seen: unknown[] = [];
    new Fdc3InteropService(f.agent).instrument$.subscribe((r) => seen.push(r));
    await flush();
    expect(f.spies.addContextListener).toHaveBeenCalledWith('fdc3.instrument', expect.any(Function));
    f.deliverContext({ type: 'fdc3.instrument', name: 'Apple Inc.', id: { ticker: 'aapl' } });
    f.deliverContext({ type: 'fdc3.instrument', id: { ticker: 'MSFT' } });
    expect(seen).toEqual([{ ticker: 'AAPL', name: 'Apple Inc.' }, { ticker: 'MSFT' }]);
  });

  it('FR3 instrument$ ignores contexts without id.ticker', async () => {
    const f = fakeAgent();
    const seen: unknown[] = [];
    new Fdc3InteropService(f.agent).instrument$.subscribe((r) => seen.push(r));
    await flush();
    f.deliverContext({ type: 'fdc3.instrument', id: { isin: 'US0378331005' } });
    f.deliverContext({ type: 'fdc3.instrument' });
    expect(seen).toEqual([]);
  });

  it('FR3 unsubscribing from instrument$ removes the FDC3 listener, even before it registered', async () => {
    const f = fakeAgent();
    const sub = new Fdc3InteropService(f.agent).instrument$.subscribe();
    sub.unsubscribe(); // listener promise still pending
    await flush();
    expect(f.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('FR3 instrument$ errors when the listener cannot be registered', async () => {
    const f = fakeAgent();
    f.spies.addContextListener.mockReturnValueOnce(Promise.reject(new Error('boom')));
    const error = vi.fn();
    new Fdc3InteropService(f.agent).instrument$.subscribe({ error });
    await flush();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });

  it('FR4 viewChart$ registers a ViewChart intent listener on subscribe and emits tickers', async () => {
    const f = fakeAgent();
    const seen: string[] = [];
    const sub = new Fdc3InteropService(f.agent).viewChart$.subscribe((t) => seen.push(t));
    await flush();
    expect(f.spies.addIntentListener).toHaveBeenCalledWith('ViewChart', expect.any(Function));
    f.deliverIntent({ type: 'fdc3.instrument', id: { ticker: 'tsla' } });
    f.deliverIntent({ type: 'fdc3.instrument', id: {} });
    expect(seen).toEqual(['TSLA']);
    sub.unsubscribe();
    await flush();
    expect(f.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('FR4 viewChart$ errors when the intent listener cannot be registered', async () => {
    const f = fakeAgent();
    f.spies.addIntentListener.mockReturnValueOnce(Promise.reject(new Error('nope')));
    const error = vi.fn();
    new Fdc3InteropService(f.agent).viewChart$.subscribe({ error });
    await flush();
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'nope' }));
  });

  it('FR4 raiseViewChart raises the ViewChart intent with an instrument context', async () => {
    const { agent, spies } = fakeAgent();
    await new Fdc3InteropService(agent).raiseViewChart('AAPL');
    expect(spies.raiseIntent).toHaveBeenCalledWith('ViewChart', {
      type: 'fdc3.instrument',
      id: { ticker: 'AAPL' },
    });
  });

  it('FR4 raiseViewChart rejects with NoAppsFound when the agent finds no handler', async () => {
    const { agent, spies } = fakeAgent();
    spies.raiseIntent.mockReturnValueOnce(Promise.reject(new Error('NoAppsFound')));
    await expect(new Fdc3InteropService(agent).raiseViewChart('AAPL')).rejects.toThrow('NoAppsFound');
  });

  it('FR2 status is fdc3', () => {
    expect(new Fdc3InteropService(fakeAgent().agent).status()).toBe('fdc3');
  });
});
