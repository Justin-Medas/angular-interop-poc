import { InjectionToken } from '@angular/core';

/** What the blotter needs from runtime config. The host app provides it, so libraries never import the shell. */
export interface BlotterSettings {
  apiBaseUrl: string;
  pollIntervalMs: number;
}

export const BLOTTER_SETTINGS = new InjectionToken<BlotterSettings>('BLOTTER_SETTINGS');
