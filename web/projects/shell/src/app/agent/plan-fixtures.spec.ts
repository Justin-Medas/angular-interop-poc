// Fixture contract test (specs/testing.md §3 "Fixture contracts", E2E stubs for FR6/FR8).
// Every plan fixture the Playwright tests stub into POST /agent/select-module must stay a valid
// WorkspacePlanResponse, otherwise the E2E suite would pass against a payload the real API can never send.
import { Ajv2020 } from 'ajv/dist/2020';
import planSchema from '@specs/agent-tool-schema.json';
import twoNones from '../../../../../e2e/fixtures/plans/two-nones-with-broadcast.json';
import unknownModule from '../../../../../e2e/fixtures/plans/unknown-module.json';

// The bundler cannot glob a directory here, so new fixtures in web/e2e/fixtures/plans must be added to this list.
const FIXTURES: Record<string, { plan: unknown; [key: string]: unknown }> = {
  'two-nones-with-broadcast': twoNones,
  'unknown-module': unknownModule,
};

// Fixtures that are deliberately off-schema because they test the shell's defence against a module it cannot render
// (FR8, E2E-9). The envelope must still be valid; the test below proves the exemption is real, not stale.
const OFF_SCHEMA_PLAN = new Set(['unknown-module']);

const ajv = new Ajv2020({ allErrors: true });
const validatePlan = ajv.compile(planSchema);

// Mirrors WorkspacePlanResponse in specs/openapi.yaml (the plan itself is validated against its own schema above).
const validateEnvelope = ajv.compile({
  type: 'object',
  additionalProperties: false,
  required: ['plan', 'source', 'latencyMs', 'toolCalls'],
  properties: {
    plan: { type: 'object' },
    source: { enum: ['model', 'fallback'] },
    model: { type: 'string' },
    latencyMs: { type: 'integer', minimum: 0 },
    toolCalls: { type: 'integer', minimum: 0, maximum: 3 },
    fallbackReason: {
      enum: ['no_api_key', 'timeout', 'model_error', 'refusal', 'tool_limit', 'invalid_output'],
    },
  },
  allOf: [
    {
      if: { properties: { source: { const: 'model' } } },
      then: { required: ['model'], not: { required: ['fallbackReason'] } },
    },
    {
      if: { properties: { source: { const: 'fallback' } } },
      then: { required: ['fallbackReason'], not: { required: ['model'] } },
    },
  ],
});

describe('plan fixture contracts', () => {
  it.each(Object.entries(FIXTURES))(
    '%s has a valid WorkspacePlanResponse envelope',
    (_name, fixture) => {
      expect(validateEnvelope(fixture), JSON.stringify(validateEnvelope.errors)).toBe(true);
    },
  );

  it.each(Object.entries(FIXTURES).filter(([name]) => !OFF_SCHEMA_PLAN.has(name)))(
    '%s plan validates against specs/agent-tool-schema.json',
    (_name, fixture) => {
      expect(validatePlan(fixture.plan), JSON.stringify(validatePlan.errors)).toBe(true);
    },
  );

  it.each([...OFF_SCHEMA_PLAN])('%s is still off-schema, so its exemption is needed', (name) => {
    expect(validatePlan(FIXTURES[name].plan)).toBe(false);
  });
});
