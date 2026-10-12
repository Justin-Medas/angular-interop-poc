import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';
import { AgentClient, CLIENT_TIMEOUT_MS } from './agent-client';
import { WorkspacePlanResponse } from './plan';

const RESPONSE: WorkspacePlanResponse = {
  plan: {
    modules: [{ module: 'none', payload: { reason: 'x' } }],
    fdc3Action: null,
    rationale: 'r',
  },
  source: 'fallback',
  latencyMs: 1,
  toolCalls: 0,
  fallbackReason: 'no_api_key',
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RUNTIME_CONFIG, useValue: { apiBaseUrl: 'http://api.test' } as RuntimeConfig },
    ],
  });
  return { client: TestBed.inject(AgentClient), http: TestBed.inject(HttpTestingController) };
}

describe('FR14 AgentClient', () => {
  afterEach(() => vi.useRealTimers());

  it('FR14 POSTs the prompt to /agent/select-module and returns the response', () => {
    const { client, http } = setup();
    let got: WorkspacePlanResponse | undefined;
    client.selectModule('show movers').subscribe((r) => (got = r));
    const req = http.expectOne('http://api.test/agent/select-module');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ prompt: 'show movers' });
    req.flush(RESPONSE);
    expect(got).toEqual(RESPONSE);
  });

  it('FR14 fails with a TimeoutError after the 15 s client timeout', () => {
    vi.useFakeTimers();
    const { client } = setup();
    let error: unknown;
    client.selectModule('slow').subscribe({ error: (e) => (error = e) });
    vi.advanceTimersByTime(CLIENT_TIMEOUT_MS - 1);
    expect(error).toBeUndefined();
    vi.advanceTimersByTime(1);
    expect(error).toBeInstanceOf(TimeoutError);
    expect(CLIENT_TIMEOUT_MS).toBe(15_000);
  });
});
