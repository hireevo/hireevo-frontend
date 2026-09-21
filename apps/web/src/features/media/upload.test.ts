import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { ACCEPT, LIMITS } from './upload.ts';

/**
 * The limits this feature states, checked against the ones the API publishes.
 *
 * The web app has to know a file is too big *before* it spends a minute
 * compressing and uploading it, so the ceilings appear here as well as in the
 * API. Two copies of a number is how a client ends up refusing what the server
 * accepts, or — far worse — promising what the server refuses, so the copy is
 * derived from the spec rather than trusted (§6.1).
 *
 * Read from the pinned `openapi.json` rather than from a running API: the pin
 * is what the generated client was built from, so this fails in the same commit
 * that would have introduced the drift.
 */
const require = createRequire(import.meta.url);
const spec = JSON.parse(
  readFileSync(require.resolve('@hireevo/api-client/openapi.json'), 'utf8'),
) as {
  components: {
    schemas: {
      UploadRequest: {
        anyOf?: Variant[];
        oneOf?: Variant[];
      };
    };
  };
};

interface Variant {
  properties: {
    role: { const?: string; enum?: string[] };
    contentType: { const?: string; enum?: string[] };
    byteSize: { maximum: number };
  };
}

const variants =
  spec.components.schemas.UploadRequest.anyOf ?? spec.components.schemas.UploadRequest.oneOf ?? [];

function roleIn(spec_: Variant): string {
  return spec_.properties.role.const ?? spec_.properties.role.enum?.[0] ?? '';
}

const variantFor = (role: string): Variant => {
  const found = variants.find((variant) => roleIn(variant) === role);
  if (found === undefined) throw new Error(`The contract declares no ${role} upload`);
  return found;
};

const typesOf = (variant: Variant): string[] => {
  const { const: only, enum: list } = variant.properties.contentType;
  return list ?? (only === undefined ? [] : [only]);
};

describe('what this app believes about uploads', () => {
  it('found the contract at all', () => {
    // Without this, every assertion below would pass vacuously against an empty
    // list if the schema were ever renamed or restructured.
    expect(variants.length).toBeGreaterThan(0);
  });

  it.each([
    ['avatar', LIMITS.avatar],
    ['portfolio-image', LIMITS.portfolioImage],
    ['portfolio-thumbnail', LIMITS.portfolioThumbnail],
    ['portfolio-document', LIMITS.portfolioDocument],
  ])('agrees with the API about the largest a %s may be', (role, believed) => {
    expect(variantFor(role).properties.byteSize.maximum).toBe(believed);
  });

  /**
   * The picker must not offer what the API will refuse to sign.
   *
   * A person choosing a HEIC out of a file dialog that said it was allowed, and
   * being told afterwards, is the failure this prevents.
   */
  it('offers exactly the image types the API will sign', () => {
    expect(ACCEPT.image.split(',').sort()).toEqual(typesOf(variantFor('portfolio-image')).sort());
  });

  it('offers exactly the document types the API will sign', () => {
    expect(ACCEPT.document.split(',').sort()).toEqual(
      typesOf(variantFor('portfolio-document')).sort(),
    );
  });

  it('only ever uploads a thumbnail as WebP, which is what the API accepts', () => {
    expect(typesOf(variantFor('portfolio-thumbnail'))).toEqual(['image/webp']);
  });
});
