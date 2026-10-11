// Settings token for the blotter library (DECISIONS #28): the shell provides it from /config.json, so the library never imports the shell.
import { InjectionToken } from '@angular/core';

/** What the blotter needs from runtime config. The host app provides it, so libraries never import the shell. */
export interface BlotterSettings {
  /** Base URL of the Go API, without a trailing slash. */
  apiBaseUrl: string;
  /** Quote refresh period; 0 fetches once (FR1). */
  pollIntervalMs: number;
}

/** Injection token for BlotterSettings. */
export const BLOTTER_SETTINGS = new InjectionToken<BlotterSettings>('BLOTTER_SETTINGS');
