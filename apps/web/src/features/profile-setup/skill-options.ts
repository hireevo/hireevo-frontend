/**
 * The approved skills the picker falls back to, and the proficiency levels.
 *
 * The taxonomy itself is served by the API and read in `skill-lists.tsx`; this
 * list is what the picker shows until that answers, and if it never does, so
 * the control is never empty. The proficiency levels are not served: they are
 * the four the contract's enum allows, named for a person to read.
 */
export const APPROVED_SKILLS = [
  'Accessibility',
  'Content design',
  'Design systems',
  'Information architecture',
  'Interaction design',
  'Journey mapping',
  'Product strategy',
  'Prototyping',
  'Service design',
  'Usability testing',
  'User research',
  'Workshop facilitation',
] as const;

export const PROFICIENCIES = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

/** Suggestions only: a language not listed here can still be typed. */
const LANGUAGE_CODES = (
  'ar bn cs da de el en es fa fi fr he hi hu id it ja ko ms nl no pa pl ps pt ro ru sv sw ta ' +
  'th tr uk ur vi zh'
).split(' ');

let languages: string[] | null = null;

/** Language names in English, from the browser rather than a table to keep current. */
export function languageOptions(): string[] {
  if (languages !== null) return languages;
  const names = new Intl.DisplayNames(['en'], { type: 'language' });
  languages = LANGUAGE_CODES.map((code) => names.of(code) ?? code).sort((a, b) =>
    a.localeCompare(b, 'en'),
  );
  return languages;
}
