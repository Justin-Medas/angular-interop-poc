// Theme state (FR11, design-tokens.md themes). Applies `data-theme` to <html> so every token swaps at once.
// The remembered choice is best-effort storage; the app must work when storage is blocked.
import { computed, effect, Injectable, inject, signal } from '@angular/core';
import { RuntimeConfigStore } from './runtime-config';

/** The two supported themes. */
export type Theme = 'dark' | 'light';
/** localStorage key for the remembered choice. */
const KEY = 'poc-theme';

/** FR11: owns `data-theme` on <html>. Order of precedence: remembered toggle choice, config `theme`, dark. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly store = inject(RuntimeConfigStore);
  private readonly choice = signal<Theme | null>(readStored());
  /** The active theme. */
  readonly theme = computed<Theme>(() => this.choice() ?? this.store.config()?.theme ?? 'dark');

  constructor() {
    effect(() => {
      document.documentElement.dataset['theme'] = this.theme();
    });
  }

  /** Switches theme and remembers it. A storage failure only means the choice is forgotten on reload. */
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

/** Reads the remembered theme; anything that is not a known theme (or unreadable storage) counts as none. */
function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}
