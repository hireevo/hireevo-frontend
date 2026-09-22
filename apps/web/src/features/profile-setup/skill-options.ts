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
