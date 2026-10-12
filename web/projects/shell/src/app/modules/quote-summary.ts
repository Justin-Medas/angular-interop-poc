// Price line shared by the instrument-detail and compare modules (FR13): last price, then signed change and change %.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Quote, signed, signedPct } from './load';

/** Last price with currency and signed change. Text only, so it renders the same in forced-colors mode. */
@Component({
  selector: 'poc-quote-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p>{{ quote().name }}</p>
    <p>{{ quote().last.toFixed(2) }} {{ quote().currency }}</p>
    <p>{{ signed(quote().change) }} ({{ signedPct(quote().changePct) }})</p>
  `,
})
export class QuoteSummary {
  /** The quote to show. */
  readonly quote = input.required<Quote>();
  protected readonly signed = signed;
  protected readonly signedPct = signedPct;
}
