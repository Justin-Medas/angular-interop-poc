// HTTP client for POST /agent/select-module (FR6, FR14). The server always answers with a valid plan, so the only
// failures seen here are transport errors, 400s and the client-side timeout below.
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, Injector } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { WorkspacePlanResponse } from './plan';

/** FR14: how long the shell waits before showing the error card. Above the server's 10 s agent budget plus network time. */
export const CLIENT_TIMEOUT_MS = 15_000;

/** Asks the agent for a workspace plan. */
@Injectable({ providedIn: 'root' })
export class AgentClient {
  private readonly http = inject(HttpClient);
  // Resolved per call: RUNTIME_CONFIG throws before config loads, and this service must be constructible with the workspace.
  private readonly injector = inject(Injector);

  /** Sends the prompt; errors with a `TimeoutError` after {@link CLIENT_TIMEOUT_MS}. */
  selectModule(prompt: string): Observable<WorkspacePlanResponse> {
    return this.http
      .post<WorkspacePlanResponse>(
        `${this.injector.get(RUNTIME_CONFIG).apiBaseUrl}/agent/select-module`,
        { prompt },
      )
      .pipe(timeout(CLIENT_TIMEOUT_MS));
  }
}
