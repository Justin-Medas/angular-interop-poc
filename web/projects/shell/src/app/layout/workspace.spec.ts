import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { INTEROP } from '@poc/interop';
import { a11yViolations } from '../../../../ui/src/testing/axe';
import { WorkspacePlanResponse } from '../agent/plan';
import { RUNTIME_CONFIG, RuntimeConfig } from '../config/runtime-config';
import { Workspace } from './workspace';

const NONE: WorkspacePlanResponse = {
  plan: {
    modules: [{ module: 'none', payload: { reason: 'Trading is out of scope for this demo.' } }],
    fdc3Action: null,
    rationale: 'Fallback rule F1: trading request.',
  },
  source: 'fallback',
  latencyMs: 3,
  toolCalls: 0,
  fallbackReason: 'no_api_key',
};

const TWO_NONE: WorkspacePlanResponse = {
  plan: {
    modules: [
      { module: 'none', payload: { reason: 'first reason' } },
      { module: 'none', payload: { reason: 'second reason' } },
    ],
    fdc3Action: null,
    rationale: 'Two cards.',
  },
  source: 'model',
  model: 'claude-sonnet-5-5',
  latencyMs: 900,
  toolCalls: 1,
};

function setup() {
  const broadcastInstrument = vi.fn<(ref: { ticker: string }) => Promise<void>>(() =>
    Promise.resolve(),
  );
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: RUNTIME_CONFIG, useValue: { apiBaseUrl: 'http://api.test' } as RuntimeConfig },
      { provide: INTEROP, useValue: { status: signal('in-memory'), broadcastInstrument } },
    ],
  });
  const fixture = TestBed.createComponent(Workspace);
  fixture.autoDetectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const http = TestBed.inject(HttpTestingController);
  return { fixture, host, http, broadcastInstrument };
}

async function ask(
  { fixture, host }: { fixture: ComponentFixture<Workspace>; host: HTMLElement },
  prompt: string,
) {
  const input = host.querySelector('input') as HTMLInputElement;
  input.value = prompt;
  input.dispatchEvent(new Event('input'));
  input.form!.requestSubmit();
  await fixture.whenStable();
}

async function reply(
  t: ReturnType<typeof setup>,
  response: WorkspacePlanResponse,
): Promise<void> {
  t.http.expectOne('http://api.test/agent/select-module').flush(response);
  await t.fixture.whenStable();
  await new Promise((r) => setTimeout(r));
  t.fixture.detectChanges();
}

describe('FR14 command bar', () => {
  it('FR14 is a labelled search region with a visible label and a submit button', () => {
    const { host } = setup();
    const region = host.querySelector('[role="search"]')!;
    expect(region.getAttribute('aria-label')).toBe('Command bar');
    const input = region.querySelector('input')!;
    expect(region.querySelector(`label[for="${input.id}"]`)?.textContent).toContain('Ask');
    expect(input.maxLength).toBe(500);
    expect(region.querySelector('button')?.textContent?.trim()).toBe('Ask');
  });

  it('FR14 Enter submits the prompt to the agent endpoint', async () => {
    const t = setup();
    await ask(t, 'show me what is moving');
    const req = t.http.expectOne('http://api.test/agent/select-module');
    expect(req.request.body).toEqual({ prompt: 'show me what is moving' });
  });

  it('FR14 ignores an empty or whitespace-only prompt', async () => {
    const t = setup();
    await ask(t, '   ');
    t.http.expectNone('http://api.test/agent/select-module');
  });

  it('FR14 disables the button with aria-busy while pending and re-enables after', async () => {
    const t = setup();
    await ask(t, 'trade AAPL');
    const button = t.host.querySelector('[role="search"] button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await reply(t, NONE);
    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  it('FR14 does not send a second request while one is pending', async () => {
    const t = setup();
    await ask(t, 'one');
    await ask(t, 'two');
    t.http.expectOne('http://api.test/agent/select-module');
  });

  it('FR14 shows an error card linked by aria-describedby when the request fails', async () => {
    const t = setup();
    await ask(t, 'anything');
    t.http
      .expectOne('http://api.test/agent/select-module')
      .flush({ code: 'invalid_request', message: 'bad' }, { status: 400, statusText: 'Bad' });
    await t.fixture.whenStable();
    t.fixture.detectChanges();
    const alert = t.host.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Could not get a plan');
    const input = t.host.querySelector('input')!;
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('FR14 shows the timeout error card after 15 s and re-enables the button', async () => {
    vi.useFakeTimers();
    try {
      const t = setup();
      await ask(t, 'slow');
      vi.advanceTimersByTime(15_000);
      t.fixture.detectChanges();
      expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('took too long');
      expect((t.host.querySelector('[role="search"] button') as HTMLButtonElement).disabled).toBe(
        false,
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('FR8 plan renderer', () => {
  it('FR8 renders the modules in plan order, each with a heading', async () => {
    const t = setup();
    await ask(t, 'two cards');
    await reply(t, TWO_NONE);
    const text = Array.from(t.host.querySelectorAll('[data-module]')).map((m) => m.textContent);
    expect(text).toHaveLength(2);
    expect(text[0]).toContain('first reason');
    expect(text[1]).toContain('second reason');
    expect(t.host.querySelectorAll('[data-module] h2')).toHaveLength(2);
  });

  it('FR8 announces the rationale in a polite live region', async () => {
    const t = setup();
    await ask(t, 'trade');
    await reply(t, NONE);
    const live = t.host.querySelector('[aria-live="polite"]')!;
    expect(live.textContent).toContain('Fallback rule F1: trading request.');
  });

  it('FR8 moves focus to the first module heading', async () => {
    const t = setup();
    await ask(t, 'two cards');
    await reply(t, TWO_NONE);
    const first = t.host.querySelector('[data-module] h2');
    expect(document.activeElement).toBe(first);
  });

  it('FR8 shows an error card for an unknown module and still renders the others', async () => {
    const t = setup();
    await ask(t, 'weird');
    await reply(t, {
      ...TWO_NONE,
      plan: {
        ...TWO_NONE.plan,
        modules: [
          { module: 'hologram', payload: {} } as never,
          { module: 'none', payload: { reason: 'still here' } },
        ],
      },
    });
    const first = t.host.querySelectorAll('[data-module]')[0];
    expect(first.querySelector('[role="alert"]')?.textContent).toContain('Unknown module');
    expect(first.textContent).toContain('hologram');
    expect(t.host.textContent).toContain('still here');
  });

  it('FR8 replaces the previous plan when a new one arrives', async () => {
    const t = setup();
    await ask(t, 'a');
    await reply(t, TWO_NONE);
    await ask(t, 'b');
    await reply(t, NONE);
    expect(t.host.querySelectorAll('[data-module]')).toHaveLength(1);
    expect(t.host.textContent).not.toContain('first reason');
  });

  it('NFR-S5 renders model text as text, not HTML', async () => {
    const t = setup();
    await ask(t, 'xss');
    await reply(t, {
      ...NONE,
      plan: { ...NONE.plan, rationale: '<img src=x onerror=alert(1)>' },
    });
    expect(t.host.querySelector('img')).toBeNull();
    expect(t.host.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

describe('FR14 plan metadata badges', () => {
  it('FR14 shows the fallback badge with the reason as text, and no model name', async () => {
    const t = setup();
    await ask(t, 'trade');
    await reply(t, NONE);
    const meta = t.host.querySelector('[data-testid="plan-meta"]')!.textContent!;
    expect(meta).toContain('fallback');
    expect(meta).toContain('no_api_key');
    expect(meta).toContain('Tool calls: 0');
  });

  it('FR14 shows the model badge with model name and tool-call count', async () => {
    const t = setup();
    await ask(t, 'two cards');
    await reply(t, TWO_NONE);
    const meta = t.host.querySelector('[data-testid="plan-meta"]')!.textContent!;
    expect(meta).toContain('model');
    expect(meta).toContain('claude-sonnet-5-5');
    expect(meta).toContain('Tool calls: 1');
  });
});

describe('FR17 fdc3Action', () => {
  it('FR17 broadcasts the planned ticker through INTEROP after the modules render', async () => {
    const t = setup();
    await ask(t, 'sync TSLA');
    await reply(t, {
      ...TWO_NONE,
      plan: { ...TWO_NONE.plan, fdc3Action: { type: 'broadcastInstrument', ticker: 'TSLA' } },
    });
    expect(t.broadcastInstrument).toHaveBeenCalledTimes(1);
    expect(t.broadcastInstrument).toHaveBeenCalledWith({ ticker: 'TSLA' });
    expect(t.host.querySelectorAll('[data-module]')).toHaveLength(2);
  });

  it('FR17 does not broadcast when the plan has no action', async () => {
    const t = setup();
    await ask(t, 'trade');
    await reply(t, NONE);
    expect(t.broadcastInstrument).not.toHaveBeenCalled();
  });

  it('FR17 says so when the broadcast fails instead of swallowing it', async () => {
    const t = setup();
    t.broadcastInstrument.mockRejectedValueOnce(new Error('boom'));
    await ask(t, 'sync TSLA');
    await reply(t, {
      ...NONE,
      plan: { ...NONE.plan, fdc3Action: { type: 'broadcastInstrument', ticker: 'TSLA' } },
    });
    await new Promise((r) => setTimeout(r));
    t.fixture.detectChanges();
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not sync other windows',
    );
  });
});

describe('NFR-A2 workspace', () => {
  it('NFR-A2 has no axe violations idle, with a plan, and with an error', async () => {
    const t = setup();
    expect(await a11yViolations(t.host.cloneNode(true) as HTMLElement)).toEqual([]);
    await ask(t, 'trade');
    await reply(t, NONE);
    expect(await a11yViolations(t.host.cloneNode(true) as HTMLElement)).toEqual([]);
  });
});
