import { toApiError, toFieldIssues, type Schema } from '@hireevo/api-client';
import { api } from '@/lib/api.ts';
import { toMinorUnits, toTypedAmount } from './location-options.ts';
import type { SectionsPayload } from './sections-payload.ts';

export type OwnProfile = Schema<'OwnProfileResponse'>;
export type UploadTicket = Schema<'UploadTicket'>;
export type VisibilitySettings = Schema<'UpdateVisibilityRequest'>;
export type ProfileVisibility = Schema<'ProfileVisibilityResponse'>;
export type ApprovedSkill = Schema<'SkillListResponse'>['skills'][number];
export type RatePeriod = OwnProfile['rates'][number]['period'];

/**
 * A price as the form holds it: the period it buys, and the amount as it is
 * typed — 85 is eighty-five dollars, not eighty-five cents.
 *
 * A list, because a profile quotes one price per period and somebody who
 * charges by the hour for small jobs and by the month for a retainer quotes
 * both. The currency is not here: no screen offers a choice, and the API
 * answers with the one every rate is quoted in.
 */
export type RateValue = { period: RatePeriod; amount: string };

/** Every period a price may be given for, shortest first, as the editor lists them. */
export const RATE_PERIODS = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const satisfies readonly RatePeriod[];

/**
 * The one currency every rate is quoted in.
 *
 * No screen offers a choice, so the API does not accept one either — this is
 * here to convert between what is typed and what is stored, which needs to know
 * how many minor units the currency has.
 */
export const RATE_CURRENCY = 'USD';

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
  'videoIntroUrl',
  'availabilityNote',
  'locationCountry',
  'locationRegion',
  'locationCity',
  'serviceArea',
  'timezone',
  'remoteMode',
  'responseTime',
  'projectLength',
  'availableFrom',
  'avatarKey',
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number];
export type ProfileValues = Record<ProfileField, string>;

/**
 * The ways a client is meant to reach somebody.
 *
 * Kept apart from the profile fields above because the API keeps them apart:
 * they travel in their own `contact` object, to their own table, and none of
 * them is ever serialised onto a public profile. The separation is the point —
 * it is visible in the request, so nothing here can drift onto a page a
 * stranger opens.
 */
export const CONTACT_FIELDS = [
  'phoneE164',
  'contactEmail',
  'whatsappE164',
  'linkedinUrl',
  'figmaUrl',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;
export type FieldErrors = Partial<Record<ProfileField | ContactField, string>>;

export const EMPTY_CONTACT: ContactValues = {
  phoneE164: '',
  contactEmail: '',
  whatsappE164: '',
  linkedinUrl: '',
  figmaUrl: '',
};

/** What the profile holds today, as the form shows it. */
export function contactOf(profile: OwnProfile): ContactValues {
  // Defended rather than assumed, though the contract says it is always there:
  // a response cached before these fields existed has no `contact` at all, and
  // the whole editor coming down over it would be a much worse answer than an
  // empty form.
  const held = profile.contact ?? {};
  return {
    phoneE164: held.phoneE164 ?? '',
    contactEmail: held.contactEmail ?? '',
    whatsappE164: held.whatsappE164 ?? '',
    linkedinUrl: held.linkedinUrl ?? '',
    figmaUrl: held.figmaUrl ?? '',
  };
}

/**
 * The form's strings as the API takes them: empty becomes null.
 *
 * An empty box means "I have not given you this", and the API's null is how
 * that is said — an empty string would be stored as a contact detail that is
 * blank rather than absent, and every reader would then have to know the
 * difference.
 */
export function toContactPayload(values: ContactValues): Record<ContactField, string | null> {
  return Object.fromEntries(
    CONTACT_FIELDS.map((field) => [
      field,
      values[field].trim() === '' ? null : values[field].trim(),
    ]),
  ) as Record<ContactField, string | null>;
}

const isContactField = (value: string | undefined): value is ContactField =>
  CONTACT_FIELDS.includes(value as ContactField);

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
    videoIntroUrl: shown(profile.videoIntroUrl),
    availabilityNote: shown(profile.availabilityNote),
    locationCountry: shown(profile.locationCountry),
    locationRegion: shown(profile.locationRegion),
    locationCity: shown(profile.locationCity),
    serviceArea: shown(profile.serviceArea),
    timezone: shown(profile.timezone),
    remoteMode: shown(profile.remoteMode),
    responseTime: shown(profile.responseTime),
    projectLength: shown(profile.projectLength),
    availableFrom: shown(profile.availableFrom),
    // Never sent back as a key: the response carries the URL it is served from,
    // and a claim only happens when a new photo has just been uploaded.
    avatarKey: '',
  };
}

/**
 * The prices as the form holds them: one entry per period that has an amount.
 *
 * Kept in the API's own order — the list comes back shortest period first —
 * rather than re-sorted here, so the editor and the profile agree about which
 * price leads.
 */
export function ratesOf(profile: OwnProfile): RateValue[] {
  return profile.rates.map((rate) => ({
    period: rate.period,
    amount: toTypedAmount(rate.amountMinor, rate.currency),
  }));
}

/**
 * Back into what the API stores: minor units, and only the periods priced.
 *
 * An entry whose amount is empty or zero is dropped rather than sent as nought
 * — a price of zero is not a price — and the whole list is always sent, so
 * removing the last one clears the prices instead of leaving the old one
 * stored.
 */
export function toRatesPayload(rates: RateValue[]) {
  return rates.flatMap((rate) => {
    const amountMinor = toMinorUnits(rate.amount, RATE_CURRENCY);
    return amountMinor === null ? [] : [{ period: rate.period, amountMinor }];
  });
}

/** An empty field is sent as null, which clears it; the API treats an absent key as "keep". */
export function toPayload(values: ProfileValues) {
  const clear = (value: string) => (value.trim() === '' ? null : value.trim());

  return {
    displayName: clear(values.displayName),
    headline: clear(values.headline),
    overview: clear(values.overview),
    videoIntroUrl: clear(values.videoIntroUrl),
    availabilityNote: clear(values.availabilityNote),
    locationCountry: clear(values.locationCountry),
    locationRegion: clear(values.locationRegion),
    locationCity: clear(values.locationCity),
    serviceArea: clear(values.serviceArea),
    timezone: clear(values.timezone),
    remoteMode: clear(values.remoteMode) as 'remote' | 'on_site' | 'hybrid' | null,
    responseTime: clear(values.responseTime) as OwnProfile['responseTime'],
    projectLength: clear(values.projectLength) as OwnProfile['projectLength'],
    availableFrom: clear(values.availableFrom),
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
  rates?: RateValue[],
  contact?: ContactValues,
): Promise<SaveResult> {
  try {
    const { data, error, response } = await api.PATCH('/api/v1/profiles/me', {
      body: {
        version,
        // Absent unless this save knows about the prices: the API leaves them
        // alone when the key is missing, and an empty list is what clears them.
        profile: {
          ...toPayload(values),
          ...(rates === undefined ? {} : { rates: toRatesPayload(rates) }),
        },
        ...(sections === undefined ? {} : { sections }),
        // Absent unless this save knows about them, for the reason the prices
        // are: the API leaves the key it is not sent alone.
        ...(contact === undefined ? {} : { contact: toContactPayload(contact) }),
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
        if ((isProfileField(field) || isContactField(field)) && fieldErrors[field] === undefined) {
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

/** Whether someone is taking work, as the API names it. */
export type Availability = NonNullable<OwnProfile['availability']>;

/**
 * Sets whether someone is taking work, and nothing else.
 *
 * Its own request, carrying only this field, because it is set from the bar at
 * the top of every page while the profile form may be half-typed underneath.
 * Sending the whole profile from up there would write the form's unsaved state
 * back to whatever was last loaded.
 */
export async function saveAvailability(
  version: number,
  availability: Availability,
): Promise<SaveResult> {
  try {
    const { data, error, response } = await api.PATCH('/api/v1/profiles/me', {
      body: { version, profile: { availability } },
    });
    if (data !== undefined) return { ok: true, profile: data };
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

/**
 * Publishes the profile.
 *
 * Nothing about the profile is required — a half-written one is its owner's to
 * publish. The `incomplete` shape stays because it describes any field-level
 * refusal the API might make in future, not the completeness gate that used to
 * produce it.
 */
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
