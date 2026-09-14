/**
 * The longest value the API accepts for each identity field.
 *
 * Copied here so the inputs can stop at the limit, and asserted against the
 * pinned openapi.json by limits.test.ts — a limit changed in the backend
 * contract fails that test rather than drifting silently (§6.1).
 */
export const IDENTITY_LIMITS = {
  displayName: 80,
  headline: 140,
  overview: 5000,
  availabilityNote: 140,
} as const;
