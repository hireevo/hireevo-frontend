import { PROFICIENCIES } from './skill-options.ts';
import { errorKey, type Entry, type EntryErrors } from './use-entries.ts';

export const LANGUAGE_FIELDS = ['name'] as const;
export const SKILL_FIELDS = ['name', 'proficiency', 'years'] as const;
export const EXPERIENCE_FIELDS = [
  'role',
  'organization',
  'startDate',
  'endDate',
  'summary',
] as const;
export const EDUCATION_FIELDS = [
  'institution',
  'qualification',
  'fieldOfStudy',
  'startDate',
  'endDate',
] as const;
export const LICENSE_FIELDS = ['name', 'issuer', 'issued', 'expires'] as const;

export const MAX_YEARS = 60;

type Items<T extends readonly string[]> = readonly Entry<T[number]>[];
type Found = Record<string, string>;

/** Today as a date input writes it, in the person's own timezone. */
export function todayIso(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Years of a skill: whole numbers only, two digits at most, as they are typed. */
export function normaliseSkill(field: (typeof SKILL_FIELDS)[number], value: string): string {
  return field === 'years' ? value.replace(/\D/g, '').slice(0, 2) : value;
}

export function isProficiency(value: string): boolean {
  return PROFICIENCIES.some((level) => level.toLowerCase() === value.trim().toLowerCase());
}

/** A value listed twice, ignoring case and spacing, is flagged where it repeats. */
function flagRepeats<F extends string>(
  items: readonly Entry<F>[],
  field: F,
  message: string,
  found: Found,
) {
  const seen = new Set<string>();
  for (const item of items) {
    const value = item.values[field].trim().toLowerCase().replace(/\s+/g, ' ');
    if (value === '') continue;
    if (seen.has(value)) found[errorKey(item.key, field)] = message;
    seen.add(value);
  }
}

export function validateLanguages(items: Items<typeof LANGUAGE_FIELDS>): EntryErrors {
  const found: Found = {};
  flagRepeats(items, 'name', 'This language is already listed.', found);
  return found;
}

export function validateSkills(items: Items<typeof SKILL_FIELDS>): EntryErrors {
  const found: Found = {};
  flagRepeats(items, 'name', 'This skill is already listed.', found);
  for (const item of items) {
    const { proficiency, years } = item.values;
    if (proficiency.trim() !== '' && !isProficiency(proficiency)) {
      found[errorKey(item.key, 'proficiency')] =
        'Choose Beginner, Intermediate, Advanced or Expert.';
    }
    if (years !== '' && Number(years) > MAX_YEARS) {
      found[errorKey(item.key, 'years')] = `Enter whole years, up to ${MAX_YEARS}.`;
    }
  }
  return found;
}

// Date inputs give `YYYY-MM-DD`, which compares correctly as a string, and an
// empty string for no date, which is never after anything.

export function validateExperience(
  items: Items<typeof EXPERIENCE_FIELDS>,
  today: string,
): EntryErrors {
  const found: Found = {};
  for (const item of items) {
    const { startDate, endDate } = item.values;
    if (startDate > today)
      found[errorKey(item.key, 'startDate')] = 'The start date is in the future.';
    if (startDate !== '' && endDate !== '' && endDate < startDate) {
      found[errorKey(item.key, 'endDate')] = 'The end date is before the start date.';
    }
  }
  return found;
}

export function validateEducation(items: Items<typeof EDUCATION_FIELDS>): EntryErrors {
  const found: Found = {};
  for (const item of items) {
    const { startDate, endDate } = item.values;
    if (startDate !== '' && endDate !== '' && endDate < startDate) {
      found[errorKey(item.key, 'endDate')] = 'The end date is before the start date.';
    }
  }
  return found;
}

export function validateLicenses(items: Items<typeof LICENSE_FIELDS>, today: string): EntryErrors {
  const found: Found = {};
  for (const item of items) {
    const { issued, expires } = item.values;
    if (issued > today) found[errorKey(item.key, 'issued')] = 'The issue date is in the future.';
    if (issued !== '' && expires !== '' && expires < issued) {
      found[errorKey(item.key, 'expires')] = 'The expiry date is before the issue date.';
    }
  }
  return found;
}
