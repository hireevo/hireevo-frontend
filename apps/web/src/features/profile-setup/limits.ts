/**
 * The longest value the API accepts for each identity field.
 *
 * Copied here so the inputs can stop at the limit, and asserted against the
 * pinned openapi.json by limits.test.ts — a limit changed in the backend
 * contract fails that test rather than drifting silently (§6.1).
 */
export const IDENTITY_LIMITS = {
  displayName: 80,
  headline: 100,
  overview: 1500,
  availabilityNote: 140,
} as const;

/**
 * Location and rate. City and the rate's digits are the API's, asserted in
 * limits.test.ts. Service area has no API field yet: 140 is the limit proposed
 * for it in the backend phase, the same as the availability note.
 */
export const LOCATION_LIMITS = {
  city: 100,
  serviceArea: 140,
  rateAmountMinor: 15,
} as const;

/**
 * Languages, skills, experience, education and licenses have no API fields yet.
 * These are the limits proposed for them in the API phase; limits.test.ts can
 * check them against the spec only once the spec has them.
 */
export const SECTION_LIMITS = {
  language: 60,
  skill: 80,
  years: 2,
  role: 120,
  organization: 120,
  summary: 1000,
  institution: 150,
  qualification: 120,
  fieldOfStudy: 120,
  license: 150,
  issuer: 150,
} as const;
