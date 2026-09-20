import type { Schema } from '@hireevo/api-client';

/** The lists as the API accepts them. */
export type SectionsPayload = NonNullable<Schema<'UpdateProfileRequest'>['sections']>;

/** What a profile's lists look like coming back from the API. */
export type SavedSections = Schema<'OwnProfileResponse'>['sections'];

// Without `undefined`: the API's own field is optional, and a value that could
// be `undefined` cannot be assigned to an optional property.
type LanguageLevel = Exclude<
  NonNullable<SectionsPayload['languages']>[number]['proficiency'],
  undefined
>;
type SkillLevel = Exclude<NonNullable<SectionsPayload['skills']>[number]['proficiency'], undefined>;

/**
 * Turns what the form holds into what the API accepts.
 *
 * The two speak slightly different languages on purpose. A form field is a
 * string because that is what an input holds — an empty one included — while
 * the API takes a number for years, an enum in lower case for proficiency, and
 * nothing at all for an entry that was never filled in. The seam between them
 * is here rather than in a component, so no screen has to remember it.
 *
 * Entries with nothing naming them are dropped: every list starts with one
 * empty entry so there is something to type into, and an empty entry is not
 * something the person added.
 *
 * Fields come in as plain records rather than as a list's internal entries, so
 * the two screens can pass what they each hold without one shape having to win.
 */
const text = (value: string | undefined): string | null => {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
};

const years = (value: string | undefined): number | null => {
  const digits = (value ?? '').trim();
  return digits === '' ? null : Number.parseInt(digits, 10);
};

/**
 * How well someone speaks a language, as the API names it.
 *
 * The options are written for a person to read — "Native or bilingual" — and
 * stored as one word, so the two are matched here rather than by lower-casing
 * a label and hoping the words line up.
 */
const LANGUAGE_LEVELS: Record<string, LanguageLevel> = {
  basic: 'basic',
  conversational: 'conversational',
  fluent: 'fluent',
  native: 'native',
  'native or bilingual': 'native',
};

const SKILL_LEVELS: Record<string, SkillLevel> = {
  beginner: 'beginner',
  intermediate: 'intermediate',
  advanced: 'advanced',
  expert: 'expert',
};

const languageLevel = (value: string | undefined): LanguageLevel =>
  LANGUAGE_LEVELS[(value ?? '').trim().toLowerCase()] ?? null;

const skillLevel = (value: string | undefined): SkillLevel =>
  SKILL_LEVELS[(value ?? '').trim().toLowerCase()] ?? null;

type Fields = Record<string, string>;

export type SectionLists = {
  languages?: readonly Fields[];
  skills?: readonly Fields[];
  experience?: readonly Fields[];
  education?: readonly Fields[];
  licenses?: readonly Fields[];
  portfolio?: readonly Fields[];
};

/**
 * Keeps only the entries something names, and only the lists that were passed.
 *
 * The naming field reaches the mapper already trimmed and known to be there,
 * which is the one field of an entry that has to be.
 */
function listOf<T>(
  rows: readonly Fields[] | undefined,
  named: string,
  map: (fields: Fields, name: string) => T,
): T[] | undefined {
  if (rows === undefined) return undefined;
  return rows
    .map((fields) => ({ fields, name: (fields[named] ?? '').trim() }))
    .filter((row) => row.name !== '')
    .map((row) => map(row.fields, row.name));
}

export function toSectionsPayload(lists: SectionLists): SectionsPayload {
  const payload: SectionsPayload = {};

  const languages = listOf(lists.languages, 'name', (fields, name) => ({
    name,
    proficiency: languageLevel(fields.proficiency),
  }));
  if (languages !== undefined) payload.languages = languages;

  const skills = listOf(lists.skills, 'name', (fields, name) => ({
    name,
    proficiency: skillLevel(fields.proficiency),
    years: years(fields.years),
  }));
  if (skills !== undefined) payload.skills = skills;

  const experience = listOf(lists.experience, 'role', (fields, role) => ({
    role,
    organization: text(fields.organization),
    startDate: text(fields.startDate),
    endDate: text(fields.endDate),
    summary: text(fields.summary),
  }));
  if (experience !== undefined) payload.experience = experience;

  const education = listOf(lists.education, 'institution', (fields, institution) => ({
    institution,
    qualification: text(fields.qualification),
    fieldOfStudy: text(fields.fieldOfStudy),
    startDate: text(fields.startDate),
    endDate: text(fields.endDate),
  }));
  if (education !== undefined) payload.education = education;

  const licenses = listOf(lists.licenses, 'name', (fields, name) => ({
    name,
    issuer: text(fields.issuer),
    // The form calls these "Issued" and "Expires"; the API names the columns.
    issuedOn: text(fields.issued),
    expiresOn: text(fields.expires),
  }));
  if (licenses !== undefined) payload.licenses = licenses;

  const portfolio = listOf(lists.portfolio, 'title', (fields, title) => ({
    title,
    url: text(fields.url),
    summary: text(fields.summary),
  }));
  if (portfolio !== undefined) payload.portfolio = portfolio;

  return payload;
}

/**
 * Turns what the API holds into what the form shows.
 *
 * Every value becomes a string, including the ones that are not: an input
 * cannot hold `null`, and a field that had never been saved would otherwise
 * render the word "null" the first time somebody opened the section.
 */
const shown = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value);

/** A proficiency is stored in one word; the form shows it the way its list offers it. */
const labelled = (value: string | null | undefined, options: readonly string[]): string => {
  if (value === null || value === undefined) return '';
  return options.find((option) => option.toLowerCase().startsWith(value)) ?? '';
};

export function fromSavedSections(
  sections: SavedSections,
  {
    languages: languageOptions = [],
    skills: skillOptions = [],
  }: {
    languages?: readonly string[];
    skills?: readonly string[];
  } = {},
) {
  return {
    languages: sections.languages.map((entry) => ({
      name: entry.name,
      proficiency: labelled(entry.proficiency, languageOptions),
    })),
    skills: sections.skills.map((entry) => ({
      name: entry.name,
      proficiency: labelled(entry.proficiency, skillOptions),
      years: shown(entry.years),
    })),
    experience: sections.experience.map((entry) => ({
      role: entry.role,
      organization: shown(entry.organization),
      startDate: shown(entry.startDate),
      endDate: shown(entry.endDate),
      summary: shown(entry.summary),
    })),
    education: sections.education.map((entry) => ({
      institution: entry.institution,
      qualification: shown(entry.qualification),
      fieldOfStudy: shown(entry.fieldOfStudy),
      startDate: shown(entry.startDate),
      endDate: shown(entry.endDate),
    })),
    licenses: sections.licenses.map((entry) => ({
      name: entry.name,
      issuer: shown(entry.issuer),
      issued: shown(entry.issuedOn),
      expires: shown(entry.expiresOn),
    })),
    portfolio: sections.portfolio.map((entry) => ({
      title: entry.title,
      url: shown(entry.url),
      summary: shown(entry.summary),
    })),
  };
}
