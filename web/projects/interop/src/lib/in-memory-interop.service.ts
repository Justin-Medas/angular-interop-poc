// In-memory InteropService (fdc3-contract.md §5; FR2, FR4). Same contract as the FDC3 adapter, carried by a
// same-origin BroadcastChannel, so tests and the no-Sail fallback work across browser tabs.
// Messages are a small tagged union; `ViewChart` is acknowledged so the sender can tell "handled" from "nobody listening".
import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { InstrumentRef, InteropService, InteropStatus } from './interop.service';

/** Wire format on the channel. `ack` answers a `viewChart` by id so raiseViewChart can resolve. */
type Message =
  | { type: 'instrument'; ref: InstrumentRef }
  | { type: 'viewChart'; id: string; ticker: string }
  | { type: 'ack'; id: string };

/** Channel name shared by every tab of this origin. */
const CHANNEL = 'poc-interop';
/** How long raiseViewChart waits for a handler before rejecting with NoAppsFound. */
const ACK_TIMEOUT_MS = 1000;

/** Guards incoming data: any tab on the origin can post to the channel, so shape is checked before use. */
const isRef = (r: unknown): r is InstrumentRef =>
  typeof r === 'object' && r !== null && typeof (r as InstrumentRef).ticker === 'string';

/** Interop over a same-origin BroadcastChannel: works across tabs without a Desktop Agent. */
@Injectable()
export class InMemoryInteropService implements InteropService, OnDestroy {
  readonly status = signal<InteropStatus>('in-memory').asReadonly();

  private readonly channel = new BroadcastChannel(CHANNEL);
  private readonly instruments = new Subject<InstrumentRef>();
  private readonly viewCharts = new Subject<string>();
  private readonly acks = new Subject<string>();
  private nextId = 0;

  readonly instrument$: Observable<InstrumentRef> = this.instruments.asObservable();

  /** Subscribing registers this instance as a ViewChart handler; it acknowledges each request. */
  readonly viewChart$ = new Observable<string>((subscriber) => {
    const sub = this.viewCharts.subscribe(subscriber);
    return () => sub.unsubscribe();
  });

  constructor() {
    this.channel.onmessage = (e: MessageEvent<unknown>) => this.receive(e.data as Message);
  }

  /** Posts to the channel. BroadcastChannel never delivers to the sender, matching FDC3 broadcast semantics. */
  broadcastInstrument(ref: InstrumentRef): Promise<void> {
    this.channel.postMessage({ type: 'instrument', ref } satisfies Message);
    return Promise.resolve();
  }

  /** Resolves when a handler acknowledges; rejects with `NoAppsFound` after ACK_TIMEOUT_MS, like a real Desktop Agent. */
  raiseViewChart(ticker: string): Promise<void> {
    // The id pairs this request with its ack; several raises can be in flight at once.
    const id = `${Date.now()}-${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        sub.unsubscribe();
        reject(new Error('NoAppsFound'));
      }, ACK_TIMEOUT_MS);
      const sub = this.acks.subscribe((ackId) => {
        if (ackId !== id) return;
        clearTimeout(timer);
        sub.unsubscribe();
        resolve();
      });
      this.channel.postMessage({ type: 'viewChart', id, ticker } satisfies Message);
    });
  }

  /** Closes the channel so a destroyed injector does not leak a listener. */
  ngOnDestroy(): void {
    this.channel.close();
  }

  private receive(msg: Message): void {
    switch (msg?.type) {
      case 'instrument':
        if (isRef(msg.ref)) this.instruments.next(msg.ref);
        break;
      case 'viewChart':
        // Only an instance with a live viewChart$ subscription handles (and acknowledges) it.
        if (this.viewCharts.observed) {
          this.viewCharts.next(msg.ticker);
          this.channel.postMessage({ type: 'ack', id: msg.id } satisfies Message);
        }
        break;
      case 'ack':
        this.acks.next(msg.id);
        break;
    }
  }
}
