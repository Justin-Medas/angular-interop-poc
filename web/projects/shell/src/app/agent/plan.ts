// Client-side types for the agent endpoint (FR6, FR8). Mirror specs/agent-tool-schema.json and the
// WorkspacePlanResponse schema in specs/openapi.yaml; the shell never builds a plan, it only renders one.

/** Chart ranges the API accepts (openapi.yaml). */
export type PlanRange = '1D' | '5D' | '1M';

/** One module the agent wants shown, tagged by `module` (SPEC §7.1). */
export type ModuleRequest =
  | { module: 'blotter'; payload: { symbols: string[] | null } }
  | { module: 'instrument-detail'; payload: { symbol: string } }
  | { module: 'price-chart'; payload: { symbol: string; range: PlanRange } }
  | { module: 'watchlist-movers'; payload: { direction: 'up' | 'down' | 'both'; limit: number } }
  | { module: 'compare'; payload: { symbols: string[] } }
  | { module: 'none'; payload: { reason: string } };

/** The only side effect a plan may request (FR17, SPEC §7.2 R6). */
export interface BroadcastInstrumentAction {
  type: 'broadcastInstrument';
  ticker: string;
}

/** The agent's structured output. */
export interface WorkspacePlan {
  modules: ModuleRequest[];
  fdc3Action: BroadcastInstrumentAction | null;
  rationale: string;
}

/** Why the server answered from the deterministic fallback (SPEC §7.5). */
export type FallbackReason =
  'no_api_key' | 'timeout' | 'model_error' | 'refusal' | 'tool_limit' | 'invalid_output';

/** Body of a 200 from POST /agent/select-module. `model` only for source=model, `fallbackReason` only for fallback. */
export interface WorkspacePlanResponse {
  plan: WorkspacePlan;
  source: 'model' | 'fallback';
  model?: string;
  latencyMs: number;
  toolCalls: number;
  fallbackReason?: FallbackReason;
}
