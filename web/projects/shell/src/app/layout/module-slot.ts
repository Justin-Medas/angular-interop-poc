// One planned module (FR8): loads its component lazily, renders it with the payload as inputs, or shows an error
// card when the name is unknown. Tells its parent when it has rendered, so focus and fdc3Action can wait for it.
import { NgComponentOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  Type,
} from '@angular/core';
import { PocCard } from '@poc/ui';
import { ModuleRequest } from '../agent/plan';
import { loaderFor } from '../modules/module-registry';

/** Renders a single {@link ModuleRequest}. Create a new slot per plan (track by the request object) rather than reusing one. */
@Component({
  selector: 'poc-module-slot',
  imports: [NgComponentOutlet, PocCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (component(); as c) {
      <ng-container *ngComponentOutlet="c; inputs: { payload: request().payload }" />
    } @else if (unknown()) {
      <poc-card heading="Module unavailable">
        <p role="alert">Unknown module “{{ request().module }}”.</p>
      </poc-card>
    }
  `,
})
export class ModuleSlot {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The module to show. */
  readonly request = input.required<ModuleRequest>();
  /** Emits the slot's element once, after its content (or error card) is in the DOM. */
  readonly ready = output<HTMLElement>();

  protected readonly component = signal<Type<unknown> | null>(null);
  protected readonly unknown = signal(false);

  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
    effect(() => {
      const loader = loaderFor(this.request().module);
      if (!loader) {
        this.unknown.set(true);
        this.announceReady();
        return;
      }
      void loader().then((c) => {
        // The plan may have been replaced while the chunk loaded; a destroyed slot must not touch its injector.
        if (this.destroyed) return;
        this.component.set(c);
        this.announceReady();
      });
    });
  }

  /** Waits for the render that follows the signal change, so the heading exists when the parent looks for it. */
  private announceReady(): void {
    afterNextRender(() => this.ready.emit(this.host.nativeElement), { injector: this.injector });
  }
}
