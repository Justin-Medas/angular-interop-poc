import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

export interface PocTab {
  id: string;
  label: string;
}

let nextId = 0;

/** WAI-ARIA tabs with automatic activation. The consumer renders the panel content for `selected()`. */
@Component({
  selector: 'poc-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="tablist" [attr.aria-label]="label()">
      @for (tab of tabs(); track tab.id) {
        <button
          role="tab"
          type="button"
          [id]="tabId(tab.id)"
          [attr.aria-selected]="tab.id === selected()"
          [attr.aria-controls]="panelId"
          [tabindex]="tab.id === selected() ? 0 : -1"
          (click)="selected.set(tab.id)"
          (keydown)="onKeydown($event, $index)"
        >
          {{ tab.label }}
        </button>
      }
    </div>
    <div role="tabpanel" [id]="panelId" [attr.aria-labelledby]="tabId(selected())">
      <ng-content />
    </div>
  `,
  styleUrl: './poc-tabs.scss',
})
export class PocTabs {
  tabs = input.required<PocTab[]>();
  selected = model.required<string>();
  label = input<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uid = `poc-tabs-${nextId++}`;
  protected readonly panelId = `${this.uid}-panel`;

  protected tabId(id: string): string {
    return `${this.uid}-tab-${id}`;
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const last = this.tabs().length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.selected.set(this.tabs()[target].id);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[target].focus();
  }
}
