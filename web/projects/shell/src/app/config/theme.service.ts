import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { RuntimeConfigStore } from './runtime-config';

export type Theme = 'dark' | 'light';
const KEY = 'poc-theme';

/** FR11: owns `data-theme` on <html>. Order of precedence: remembered toggle choice, config `theme`, dark. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(RuntimeConfigStore);
  private readonly choice = signal<Theme | null>(readStored());
  readonly theme = computed<Theme>(() => this.choice() ?? this.store.config()?.theme ?? 'dark');

  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
    });
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.choice.set(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Best effort (FR11): private windows and blocked storage just forget the choice on reload.
    }
  }
}

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}
