import spec from '@hireevo/api-client/openapi.json';
import { describe, expect, it } from 'vitest';
import { IDENTITY_LIMITS } from './limits.ts';

type JsonSchema = {
  maxLength?: number;
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
