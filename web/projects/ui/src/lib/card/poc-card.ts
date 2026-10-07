import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

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
  heading = input<string>();
  protected readonly headingId = `poc-card-${nextId++}`;
}
