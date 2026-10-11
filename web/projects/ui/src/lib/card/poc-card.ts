// Titled surface used by module components and the UI gallery (FR13). With a heading it becomes a labelled
// region, so assistive tech can jump to it; without one it is a plain section with no label.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Counter for unique heading ids; several cards render on one page. */
let nextId = 0;

/** Surface with an optional <h2> heading and projected content. */
@Component({
  selector: 'poc-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [attr.aria-labelledby]="heading() ? headingId : null">
      @if (heading()) {
        <h2 [id]="headingId">{{ heading() }}</h2>
      }
      <ng-content />
    </section>
  `,
  styleUrl: './poc-card.scss',
})
export class PocCard {
  /** Heading text; when set, the card is labelled by it. */
  heading = input<string>();
  protected readonly headingId = `poc-card-${nextId++}`;
}
