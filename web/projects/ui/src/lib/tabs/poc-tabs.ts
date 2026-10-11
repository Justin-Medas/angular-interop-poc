// Tabs per the WAI-ARIA tabs pattern with automatic activation (accessibility.md §5; FR12). One tab stop for the
// whole list (roving tabindex); arrow keys, Home and End move focus and selection together.
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

/** One tab: a stable `id` (used for ids and selection) and its visible `label`. */
export interface PocTab {
  id: string;
  label: string;
}

/** Counter so ids stay unique when several tab lists are on the page. */
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
  /** The tabs, in order. */
  tabs = input.required<PocTab[]>();
  /** Id of the active tab. Two-way: the consumer can also set it, e.g. when ViewChart activates the chart tab (FR4). */
  selected = model.required<string>();
  /** Accessible name of the tab list. */
  label = input<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uid = `poc-tabs-${nextId++}`;
  protected readonly panelId = `${this.uid}-panel`;

  protected tabId(id: string): string {
    return `${this.uid}-tab-${id}`;
  }

  /** Arrow keys wrap around; Home and End jump to the ends. Moves focus explicitly because roving tabindex means only the selected tab is focusable by Tab. */
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
