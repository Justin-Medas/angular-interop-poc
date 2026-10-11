// Settings token for the detail library (DECISIONS #28): the shell provides it from /config.json, so the library never imports the shell.
import { InjectionToken } from '@angular/core';

/** What the detail app needs from runtime config. The host app provides it, so libraries never import the shell. */
export interface DetailSettings {
  /** Base URL of the Go API, without a trailing slash. */
  apiBaseUrl: string;
}

/** Injection token for DetailSettings. */
export const DETAIL_SETTINGS = new InjectionToken<DetailSettings>('DETAIL_SETTINGS');
