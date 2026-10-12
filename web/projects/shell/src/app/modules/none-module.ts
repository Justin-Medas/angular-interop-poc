// The `none` module (FR13): a message card saying why the request is out of scope. The agent's refusal path
// (trading, advice, unknown instruments) always ends here.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PocCard } from '@poc/ui';

/** Message card for a request the demo cannot serve. `reason` is model text, so it is interpolated, never bound as HTML (NFR-S5). */
@Component({
  selector: 'poc-none-module',
  imports: [PocCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <poc-card heading="Out of scope">
      <p>{{ payload().reason }}</p>
    </poc-card>
  `,
})
export class NoneModule {
  /** The plan's payload for this module. */
  readonly payload = input.required<{ reason: string }>();
}
