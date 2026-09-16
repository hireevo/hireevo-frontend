import { toApiError, toFieldIssues, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import type { SectionsPayload } from './sections-payload.ts';

export type OwnProfile = Schema<'OwnProfileResponse'>;
export type UploadTicket = Schema<'UploadTicket'>;
export type VisibilitySettings = Schema<'UpdateVisibilityRequest'>;
export type ProfileVisibility = Schema<'ProfileVisibilityResponse'>;
export type ApprovedSkill = Schema<'SkillListResponse'>['skills'][number];

/**
 * Every field of the profile the form edits, as the form holds them: strings,
 * empty when unset.
 *
 * One list rather than one per screen. The profile is saved in a single request
 * whatever section it was typed in, and a field missing from here is a field a
 * screen can collect and never send — which is the failure this list exists to
 * make impossible.
 */
export const PROFILE_FIELDS = [
  'displayName',
  'headline',
  'overview',
  'availabilityNote',
  'locationCountry',
  'locationRegion',
  'locationCity',
  'serviceArea',
  'timezone',
  'remoteMode',
  'rateAmountMinor',
  'rateCurrency',
  'avatarKey',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileValues = Record<ProfileField, string>;
export type FieldErrors = Partial<Record<ProfileField, string>>;

/** The four Identity and story fields, for the places that still speak of them. */
export const IDENTITY_FIELDS = [
  'displayName',
  'headline',
  'overview',
  'availabilityNote',
] as const satisfies readonly ProfileField[];
export type IdentityField = (typeof IDENTITY_FIELDS)[number];
export type IdentityValues = Pick<ProfileValues, IdentityField>;

export const EMPTY_VALUES: ProfileValues = Object.fromEntries(
  PROFILE_FIELDS.map((field) => [field, '']),
) as ProfileValues;

const UNREACHABLE = 'Could not reach HireEvo. Check your connection and try again.';

function messageOf(error: unknown): string {
  const envelope = toApiError(error);
  if (envelope === null) return UNREACHABLE;
  return envelope.code === 'RATE_LIMITED'
    ? 'Too many requests. Wait a moment and try again.'
    : envelope.message;
}

function isProfileField(value: string | undefined): value is ProfileField {
  return (PROFILE_FIELDS as readonly string[]).includes(value ?? '');
}

/** What the API holds, as the form shows it: a string for every field. */
export function valuesOf(profile: OwnProfile): ProfileValues {
  const shown = (value: string | null | undefined) => value ?? '';

  return {
    displayName: shown(profile.displayName),
    headline: shown(profile.headline),
    overview: shown(profile.overview),
    availabilityNote: shown(profile.availabilityNote),
    locationCountry: shown(profile.locationCountry),
    locationRegion: shown(profile.locationRegion),
    locationCity: shown(profile.locationCity),
    serviceArea: shown(profile.serviceArea),
    timezone: shown(profile.timezone),
    remoteMode: shown(profile.remoteMode),
    rateAmountMinor: shown(profile.rateAmountMinor),
    rateCurrency: shown(profile.rateCurrency),
    // Never sent back as a key: the response carries the URL it is served from,
    // and a claim only happens when a new photo has just been uploaded.
    avatarKey: '',
  };
}

/** An empty field is sent as null, which clears it; the API treats an absent key as "keep". */
export function toPayload(values: ProfileValues) {
  const clear = (value: string) => (value.trim() === '' ? null : value.trim());

  return {
    displayName: clear(values.displayName),
    headline: clear(values.headline),
    overview: clear(values.overview),
    availabilityNote: clear(values.availabilityNote),
    locationCountry: clear(values.locationCountry),
    locationRegion: clear(values.locationRegion),
    locationCity: clear(values.locationCity),
    serviceArea: clear(values.serviceArea),
    timezone: clear(values.timezone),
    remoteMode: clear(values.remoteMode) as 'remote' | 'on_site' | 'hybrid' | null,
    rateAmountMinor: clear(values.rateAmountMinor),
    rateCurrency: clear(values.rateCurrency),
    // Absent unless a photo was just claimed: sending null would clear the one
    // already on the profile every time anything else was saved.
    ...(values.avatarKey.trim() === '' ? {} : { avatarKey: values.avatarKey.trim() }),
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

/**
 * One save of the whole profile, against the version the form was loaded at.
 *
 * Fields and lists go in the same request because they are one decision by the
 * person: pressing Save. Two requests would take two versions, and the second
 * would lose to the first.
 */
export async function saveProfile(
  version: number,
  values: ProfileValues,
  sections?: SectionsPayload,
): Promise<SaveResult> {
  try {
    const { data, error, response } = await api.PATCH('/api/v1/profiles/me', {
      body: {
        version,
        profile: toPayload(values),
        ...(sections === undefined ? {} : { sections }),
      },
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
        if (isProfileField(field) && fieldErrors[field] === undefined) {
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

export type VisibilityResult =
  | { ok: true; visibility: ProfileVisibility }
  | { ok: false; kind: 'conflict'; message: string }
  | { ok: false; kind: 'failed'; message: string };

/** Who may see which section. Versioned like every other write to the profile. */
export async function saveVisibility(settings: VisibilitySettings): Promise<VisibilityResult> {
  try {
    const { data, error, response } = await api.PUT('/api/v1/profiles/me/visibility', {
      body: settings,
    });
    if (data !== undefined) return { ok: true, visibility: data };

    if (response.status === 409) {
      return {
        ok: false,
        kind: 'conflict',
        message: 'This profile was changed in another tab or window.',
      };
    }
    return { ok: false, kind: 'failed', message: messageOf(error) };
  } catch {
    return { ok: false, kind: 'failed', message: UNREACHABLE };
  }
}

export type AvatarResult = { ok: true; key: string } | { ok: false; message: string };

/**
 * Uploads a photo and answers with the key to claim.
 *
 * Two steps, because the bytes never go through the API: it signs an upload,
 * and the browser sends the file straight to storage. The key is claimed with
 * the next save of the profile, so an upload nobody finished changes nothing.
 */
export async function uploadAvatar(file: File): Promise<AvatarResult> {
  const contentType = file.type;
  if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') {
    return { ok: false, message: 'Choose a JPEG, PNG or WebP image.' };
  }

  let ticket: UploadTicket;
  try {
    const { data, error } = await api.POST('/api/v1/profiles/me/avatar-upload', {
      body: { contentType },
    });
    if (data === undefined) return { ok: false, message: messageOf(error) };
    ticket = data;
  } catch {
    return { ok: false, message: UNREACHABLE };
  }

  if (file.size > ticket.maxBytes) {
    const megabytes = Math.floor(ticket.maxBytes / 1_000_000);
    return { ok: false, message: `That image is over ${megabytes}MB. Choose a smaller one.` };
  }

  const form = new FormData();
  // The fields the signature covers go first, in order; the file is last, which
  // is what S3-compatible storage expects of a pre-signed post.
  for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
  form.append('file', file);

  try {
    const response = await fetch(ticket.url, { method: 'POST', body: form });
    if (!response.ok) {
      return { ok: false, message: 'The photo could not be stored. Try again.' };
    }
  } catch {
    return { ok: false, message: 'The photo could not be stored. Try again.' };
  }

  return { ok: true, key: ticket.key };
}

/** The approved skills, narrowed by what someone is typing. */
export async function listSkills(query?: string): Promise<ApprovedSkill[]> {
  try {
    const { data } = await api.GET('/api/v1/skills', {
      params: { query: query === undefined || query === '' ? {} : { query } },
    });
    return data?.skills ?? [];
  } catch {
    return [];
  }
}

export type SuggestResult = { ok: true } | { ok: false; message: string };

/** Asks for a skill the taxonomy does not have. Asking twice is the same request. */
export async function suggestSkill(name: string): Promise<SuggestResult> {
  try {
    const { data, error } = await api.POST('/api/v1/skills/suggestions', { body: { name } });
    return data === undefined ? { ok: false, message: messageOf(error) } : { ok: true };
  } catch {
    return { ok: false, message: UNREACHABLE };
  }
}

export type PublishIssue = { field: string; message: string };

export type PublishResult =
  | { ok: true; profile: OwnProfile }
  | { ok: false; kind: 'incomplete'; issues: PublishIssue[] }
  | { ok: false; kind: 'conflict'; message: string }
  | { ok: false; kind: 'failed'; message: string };

/** Publishes the profile. The API checks it against a stricter schema than a save. */
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
