// Failover facade behind INTEROP when `provider: "fdc3"` (fdc3-contract.md §5; DECISIONS #30).
// Why a facade: consumers inject one object for the app's lifetime, so the adapter choice has to be made
// inside it, not by swapping the provider after startup.
import { Injectable, inject, signal } from '@angular/core';
import { Observable, defer, from, switchMap } from 'rxjs';
import { Fdc3InteropService } from './fdc3-interop.service';
import { GET_AGENT } from './get-agent';
import { InMemoryInteropService } from './in-memory-interop.service';
import { InstrumentRef, InteropService, InteropStatus } from './interop.service';
import { INTEROP_OPTIONS } from './provide-interop';

/**
 * Tries a Desktop Agent first. If `getAgent()` fails or exceeds `connectTimeoutMs`, it switches to the
 * in-memory adapter and the status badge says so. Callers never see the switch: every call waits for `ready`.
 */
@Injectable()
export class FailoverInteropService implements InteropService {
  private readonly inMemory = inject(InMemoryInteropService);
  private readonly _status = signal<InteropStatus>('connecting');
  readonly status = this._status.asReadonly();

  private readonly ready: Promise<InteropService> = this.connect();

  readonly instrument$: Observable<InstrumentRef> = defer(() => from(this.ready)).pipe(
    switchMap((d) => d.instrument$),
  );
  readonly viewChart$: Observable<string> = defer(() => from(this.ready)).pipe(
    switchMap((d) => d.viewChart$),
  );

  /** Waits for the connection attempt, so calls made while `connecting` are delayed, not lost. */
  async broadcastInstrument(ref: InstrumentRef): Promise<void> {
    return (await this.ready).broadcastInstrument(ref);
  }

  /** Waits for the connection attempt, then delegates to whichever adapter won. */
  async raiseViewChart(ticker: string): Promise<void> {
    return (await this.ready).raiseViewChart(ticker);
  }

  /**
   * Races `getAgent()` against our own timer, because a hung getAgent must not hang the app.
   * A late agent after the timeout is ignored: the status has already told the user we are in-memory.
   */
  private async connect(): Promise<InteropService> {
    const { connectTimeoutMs } = inject(INTEROP_OPTIONS);
    const getAgent = inject(GET_AGENT);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Fdc3ConnectTimeout')), connectTimeoutMs);
    });
    try {
      const agent = await Promise.race([getAgent({ timeoutMs: connectTimeoutMs }), timeout]);
      this._status.set('fdc3');
      return new Fdc3InteropService(agent);
    } catch {
      this._status.set('in-memory');
      return this.inMemory;
    } finally {
      clearTimeout(timer);
    }
  }
}
