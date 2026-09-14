import { toApiError, toFieldIssues, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';

export type OwnProfile = Schema<'OwnProfileResponse'>;

export const IDENTITY_FIELDS = ['displayName', 'headline', 'overview', 'availabilityNote'] as const;
export type IdentityField = (typeof IDENTITY_FIELDS)[number];
export type IdentityValues = Record<IdentityField, string>;
export type FieldErrors = Partial<Record<IdentityField, string>>;

const UNREACHABLE = 'Could not reach HireEvo. Check your connection and try again.';

function messageOf(error: unknown): string {
  const envelope = toApiError(error);
  if (envelope === null) return UNREACHABLE;
  return envelope.code === 'RATE_LIMITED'
    ? 'Too many requests. Wait a moment and try again.'
    : envelope.message;
}

function isIdentityField(value: string | undefined): value is IdentityField {
  return (IDENTITY_FIELDS as readonly string[]).includes(value ?? '');
}

/** An empty field is sent as null, which clears it; the API treats an absent key as "keep". */
export function toPayload(values: IdentityValues) {
  const clear = (value: string) => (value.trim() === '' ? null : value.trim());
  return {
    displayName: clear(values.displayName),
    headline: clear(values.headline),
    overview: clear(values.overview),
    availabilityNote: clear(values.availabilityNote),
  };
}

export type LoadResult = { ok: true; profile: OwnProfile } | { ok: false; message: string };

/**
 * The signed-in person's profile, created on first visit.
 *
 * A 409 from the create is not a failure: it means the profile was created a
 * moment ago — by another tab, or by React running this effect twice in
 * development — so the answer is to read it.
 */
export async function loadOrCreateProfile(): Promise<LoadResult> {
  try {
    const own = await api.GET('/api/v1/profiles/me');
    if (own.data !== undefined) return { ok: true, profile: own.data };
    if (own.response.status !== 404) return { ok: false, message: messageOf(own.error) };

    const created = await api.POST('/api/v1/profiles');
    if (created.data !== undefined) return { ok: true, profile: created.data };
    if (created.response.status !== 409) return { ok: false, message: messageOf(created.error) };

    const again = await api.GET('/api/v1/profiles/me');
    return again.data !== undefined
      ? { ok: true, profile: again.data }
      : { ok: false, message: messageOf(again.error) };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

export type SaveResult =
  | { ok: true; profile: OwnProfile }
  | { ok: false; kind: 'conflict'; message: string }
  | { ok: false; kind: 'invalid'; message: string; fieldErrors: FieldErrors }
  | { ok: false; kind: 'failed'; message: string };

/** One autosave of the identity fields, against the version the form was loaded at. */
export async function saveIdentity(version: number, values: IdentityValues): Promise<SaveResult> {
  try {
    const { data, error, response } = await api.PATCH('/api/v1/profiles/me', {
      body: { version, profile: toPayload(values) },
    });
    if (data !== undefined) return { ok: true, profile: data };

    if (response.status === 409) {
      return {
        ok: false,
        kind: 'conflict',
        message: 'This profile was changed in another tab or window.',
      };
    }

    if (response.status === 400) {
      const fieldErrors: FieldErrors = {};
      for (const issue of toFieldIssues(error)) {
        const field = issue.path.split('.').at(-1);
        if (isIdentityField(field) && fieldErrors[field] === undefined) {
          fieldErrors[field] = issue.message;
        }
      }
      return { ok: false, kind: 'invalid', message: messageOf(error), fieldErrors };
    }

    return { ok: false, kind: 'failed', message: messageOf(error) };
  } catch {
    return { ok: false, kind: 'failed', message: UNREACHABLE };
  }
}

export type PublishIssue = { field: string; message: string };

export type PublishResult =
  | { ok: true; profile: OwnProfile }
  | { ok: false; kind: 'incomplete'; issues: PublishIssue[] }
  | { ok: false; kind: 'conflict'; message: string }
  | { ok: false; kind: 'failed'; message: string };

/** Publishes the profile. The API checks it against a stricter schema than autosave. */
export async function publishProfile(): Promise<PublishResult> {
  try {
    const { data, error, response } = await api.POST('/api/v1/profiles/me/publish');
    if (data !== undefined) return { ok: true, profile: data };

    if (response.status === 400) {
      const issues = toFieldIssues(error).map((issue) => ({
        field: issue.path.split('.').at(-1) ?? issue.path,
        message: issue.message,
      }));
      if (issues.length > 0) return { ok: false, kind: 'incomplete', issues };
    }
    if (response.status === 409) {
      return {
        ok: false,
        kind: 'conflict',
        message: 'This profile changed while it was being published. Try again.',
      };
    }
    return { ok: false, kind: 'failed', message: messageOf(error) };
  } catch {
    return { ok: false, kind: 'failed', message: UNREACHABLE };
  }
}
