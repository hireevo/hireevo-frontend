/** How well someone speaks a language, in the order the options are offered. */
export const PROFICIENCIES = ['Basic', 'Conversational', 'Fluent', 'Native or bilingual'] as const;

export type Proficiency = (typeof PROFICIENCIES)[number];

export type ProfileLanguage = { name: string; proficiency: Proficiency };

/** The four sections that hold a list of entries rather than a single value. */
export type RecordSectionId = 'workExperience' | 'education' | 'certifications' | 'portfolio';

/** One entry in such a section, keyed by the field names its spec declares. */
export type ProfileRecord = { id: string; fields: Record<string, string> };

/** What the builder holds while it is being filled in. */
export type ProfileDraft = {
  displayName: string;
  title: string;
  /** What the photo is shown from: the browser's own copy until the profile is saved. */
  avatarUrl: string | null;
  /** The uploaded photo waiting to be claimed by the next save. Empty once it has been. */
  avatarKey: string;
  country: string;
  languages: ProfileLanguage[];
  about: string;
  skills: string[];
  records: Record<RecordSectionId, ProfileRecord[]>;
};

export const EMPTY_DRAFT: ProfileDraft = {
  displayName: '',
  title: '',
  avatarUrl: null,
  avatarKey: '',
  country: '',
  languages: [],
  about: '',
  skills: [],
  records: { workExperience: [], education: [], certifications: [], portfolio: [] },
};

/**
 * The five things the footer counts.
 *
 * The frame shows "1 of 5 key steps" and "20% complete" on a profile where
 * nothing is filled in except one language, which is what fixes both the list
 * and its length: these five, and not the four sections marked "(Optional)".
 */
export const KEY_STEPS = [
  { id: 'languages', label: 'Languages', isDone: (d: ProfileDraft) => d.languages.length > 0 },
  { id: 'photo', label: 'Profile photo', isDone: (d: ProfileDraft) => d.avatarUrl !== null },
  {
    id: 'identity',
    label: 'Display name and title',
    isDone: (d: ProfileDraft) => d.displayName.trim() !== '' && d.title.trim() !== '',
  },
  { id: 'about', label: 'About', isDone: (d: ProfileDraft) => d.about.trim() !== '' },
  { id: 'skills', label: 'Skills and expertise', isDone: (d: ProfileDraft) => d.skills.length > 0 },
] as const;

export type Completion = { done: number; total: number; percent: number };

export function completionOf(draft: ProfileDraft): Completion {
  const done = KEY_STEPS.filter((step) => step.isDone(draft)).length;
  return { done, total: KEY_STEPS.length, percent: Math.round((done / KEY_STEPS.length) * 100) };
}
