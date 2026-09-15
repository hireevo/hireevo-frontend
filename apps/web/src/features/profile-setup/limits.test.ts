import spec from '@hireevo/api-client/openapi.json';
import { describe, expect, it } from 'vitest';
import { IDENTITY_LIMITS, LOCATION_LIMITS } from './limits.ts';

type JsonSchema = {
  maxLength?: number;
  pattern?: string;
  properties?: Record<string, JsonSchema>;
  anyOf?: JsonSchema[];
};

const schemas = (spec as unknown as { components: { schemas: Record<string, JsonSchema> } })
  .components.schemas;

/** A nullable field is published as `anyOf: [{ type: string, maxLength }, { type: null }]`. */
function maxLengthOf(schema: JsonSchema | undefined): number | undefined {
  if (schema === undefined) return undefined;
  if (schema.maxLength !== undefined) return schema.maxLength;
  for (const option of schema.anyOf ?? []) {
    const found = maxLengthOf(option);
    if (found !== undefined) return found;
  }
  return undefined;
}

describe('identity field limits', () => {
  const draft = schemas['UpdateProfileRequest']?.properties?.['profile'];

  it('are read from a spec that describes the autosave body', () => {
    // Without this the loop below could pass against a spec with no such schema.
    expect(draft?.properties).toBeDefined();
  });

  it.each(Object.entries(IDENTITY_LIMITS))('%s stops where the API does', (field, max) => {
    // A limit changed in the backend contract fails here, not in a form that
    // quietly lets someone type past what the server will accept (§6.1).
    expect(maxLengthOf(draft?.properties?.[field])).toBe(max);
  });
});

describe('location and rate limits', () => {
  const draft = schemas['UpdateProfileRequest']?.properties?.['profile'];

  it('stop the city where the API does', () => {
    expect(maxLengthOf(draft?.properties?.['locationCity'])).toBe(LOCATION_LIMITS.city);
  });

  it('allow as many digits in the rate as the API does', () => {
    const rate = draft?.properties?.['rateAmountMinor'];
    const pattern = rate?.pattern ?? rate?.anyOf?.find((option) => option.pattern)?.pattern;
    expect(pattern).toBe(`^\\d{1,${LOCATION_LIMITS.rateAmountMinor}}$`);
  });
});
