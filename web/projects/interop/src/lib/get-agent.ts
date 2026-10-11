// Token for reaching a Desktop Agent (fdc3-contract.md §5; DECISIONS #30). Kept as a token so unit tests inject
// a fake agent, and so `@finos/fdc3` is a lazy import that in-memory environments never download.
import { InjectionToken } from '@angular/core';
import type { GetAgentParams } from '@finos/fdc3';

/** Same signature as `getAgent` from `@finos/fdc3`. */
type GetAgent = (params?: GetAgentParams) => Promise<import('@finos/fdc3').DesktopAgent>;

/**
 * How the app reaches a Desktop Agent. A token so tests can fake it. The default imports `@finos/fdc3`
 * on first use, so environments on the in-memory adapter never download it.
 */
export const GET_AGENT = new InjectionToken<GetAgent>('GET_AGENT', {
  providedIn: 'root',
  factory: () => (params) => import('@finos/fdc3').then((m) => m.getAgent(params)),
});
