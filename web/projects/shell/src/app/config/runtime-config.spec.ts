import { TestBed } from '@angular/core/testing';
import {
  ConfigError,
  parseRuntimeConfig,
  provideRuntimeConfig,
  RUNTIME_CONFIG,
  RuntimeConfigStore,
} from './runtime-config';

const valid = {
  environment: 'local',
  apiBaseUrl: 'http://localhost:8080',
  interop: { provider: 'in-memory', connectTimeoutMs: 3000 },
  theme: 'dark',
  quotes: { pollIntervalMs: 2000 },
  auth: {
    enabled: false,
    clientId: '',
    authority: '',
    redirectUri: '',
    cacheLocation: 'sessionStorage',
    scopes: [],
  },
};

function issuesFor(raw: unknown): string[] {
  try {
    parseRuntimeConfig(raw);
  } catch (e) {
    return (e as ConfigError).issues;
  }
  return [];
}

describe('FR10 parseRuntimeConfig', () => {
  it('FR10 accepts a config that matches specs/runtime-config.schema.json', () => {
    expect(parseRuntimeConfig(valid).apiBaseUrl).toBe('http://localhost:8080');
  });

  it('FR10 accepts a config without the optional theme and quotes', () => {
    const { theme: _t, quotes: _q, ...minimal } = valid;
    expect(parseRuntimeConfig(minimal).interop.provider).toBe('in-memory');
  });

  it.each([
    ['a missing apiBaseUrl', { ...valid, apiBaseUrl: undefined }, 'apiBaseUrl'],
    ['an unknown environment', { ...valid, environment: 'prod' }, '/environment'],
    ['a malformed apiBaseUrl', { ...valid, apiBaseUrl: 'not a url' }, '/apiBaseUrl'],
    ['an unknown extra property', { ...valid, extra: 1 }, 'extra'],
    [
      'a connect timeout under 500 ms',
      { ...valid, interop: { provider: 'fdc3', connectTimeoutMs: 100 } },
      '/interop/connectTimeoutMs',
    ],
    ['auth.enabled true', { ...valid, auth: { ...valid.auth, enabled: true } }, '/auth/enabled'],
    ['a non-object body', 'nope', 'must be object'],
  ])('FR10 rejects %s and names the offending path', (_name, raw, fragment) => {
    const issues = issuesFor(raw);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join('\n')).toContain(fragment);
  });
});

describe('FR10 RuntimeConfigStore', () => {
  const respond = (body: unknown, init: ResponseInit = {}) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), init));

  beforeEach(() => TestBed.configureTestingModule({}));
  afterEach(() => vi.unstubAllGlobals());

  it('FR10 load() fetches /config.json and exposes the validated config', async () => {
    const fetchMock = respond(valid);
    vi.stubGlobal('fetch', fetchMock);
    const store = TestBed.inject(RuntimeConfigStore);
    await store.load();
    expect(fetchMock).toHaveBeenCalledWith('/config.json', { cache: 'no-store' });
    expect(store.config()?.environment).toBe('local');
    expect(store.errors()).toEqual([]);
  });

  it('FR10 an invalid config leaves config null and lists the issues', async () => {
    vi.stubGlobal('fetch', respond({ ...valid, environment: 'prod' }));
    const store = TestBed.inject(RuntimeConfigStore);
    await store.load();
    expect(store.config()).toBeNull();
    expect(store.errors().join('\n')).toContain('/environment');
  });

  it('FR10 an HTTP error is reported with its status', async () => {
    vi.stubGlobal('fetch', respond({}, { status: 404 }));
    const store = TestBed.inject(RuntimeConfigStore);
    await store.load();
    expect(store.config()).toBeNull();
    expect(store.errors()).toEqual(['GET /config.json returned HTTP 404']);
  });

  it('FR10 a body that is not JSON is reported', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })));
    const store = TestBed.inject(RuntimeConfigStore);
    await store.load();
    expect(store.errors()).toEqual(['/config.json is not valid JSON']);
  });

  it('FR10 a network failure is reported', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const store = TestBed.inject(RuntimeConfigStore);
    await store.load();
    expect(store.errors()).toEqual(['Could not fetch /config.json: Failed to fetch']);
  });
});

describe('FR10 RUNTIME_CONFIG token', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('FR10 provideRuntimeConfig loads before bootstrap and the token returns the config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(valid))));
    TestBed.configureTestingModule({ providers: [provideRuntimeConfig()] });
    await TestBed.inject(RuntimeConfigStore).load();
    expect(TestBed.inject(RUNTIME_CONFIG).environment).toBe('local');
  });

  it('FR10 reading the token before a valid config exists throws instead of half-starting', () => {
    TestBed.configureTestingModule({ providers: [provideRuntimeConfig()] });
    expect(() => TestBed.inject(RUNTIME_CONFIG)).toThrow(/before a valid \/config\.json/);
  });
});
