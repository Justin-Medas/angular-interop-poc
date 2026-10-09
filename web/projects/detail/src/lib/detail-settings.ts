import { InjectionToken } from '@angular/core';

/** What the detail app needs from runtime config. The host app provides it, so libraries never import the shell. */
export interface DetailSettings {
  apiBaseUrl: string;
}

export const DETAIL_SETTINGS = new InjectionToken<DetailSettings>('DETAIL_SETTINGS');
