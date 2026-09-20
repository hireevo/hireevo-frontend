import type { DraftFile } from '@/features/media/upload.ts';

/** How well someone speaks a language, in the order the options are offered. */
export const PROFICIENCIES = ['Basic', 'Conversational', 'Fluent', 'Native or bilingual'] as const;

export type Proficiency = (typeof PROFICIENCIES)[number];

export type ProfileLanguage = { name: string; proficiency: Proficiency };

/** The sections that hold a list of entries rather than a single value. */
export type RecordSectionId = 'workExperience' | 'education' | 'certifications' | 'portfolio';

/**
 * One entry in such a section, keyed by the field names its spec declares.
 *
 * `files` is the portfolio's alone — the images and documents attached to a
 * piece, already uploaded and waiting to be claimed by the next save. It sits
 * beside `fields` rather than inside it because a file is a record of several
 * values, and squeezing one into a string map is how a shape stops being
 * checkable.
 */
export type ProfileRecord = {
  id: string;
  fields: Record<string, string>;
  files?: DraftFile[];
};

/**
 * What the builder holds that the profile fields and lists do not.
 *
 * The biography, the skills and the dated lists live where they are edited and
 * saved — in the profile draft and the entry lists — so they are not copied
 * here. Two copies of one answer is how a page comes to show a number that
 * disagrees with what was saved.
 */
export type ProfileDraft = {
  displayName: string;
  title: string;
  /** What the photo is shown from: the browser's own copy until the profile is saved. */
  avatarUrl: string | null;
  /** The uploaded photo waiting to be claimed by the next save. Empty once it has been. */
  avatarKey: string;
  country: string;
  languages: ProfileLanguage[];
  records: Record<RecordSectionId, ProfileRecord[]>;
};

export const EMPTY_DRAFT: ProfileDraft = {
  displayName: '',
  title: '',
  avatarUrl: null,
  avatarKey: '',
  country: '',
  languages: [],
  records: { workExperience: [], education: [], certifications: [], portfolio: [] },
};

/** A part of the profile a buyer reads, and which counts towards completion. */
export type SectionId =
  'about' | 'skills' | 'experience' | 'education' | 'certifications' | 'portfolio' | 'videoIntro';

/**
 * What each section is worth.
 *
 * Skills, work experience and portfolio carry twenty each: they are what a
 * buyer decides on. The four that are left share the remaining forty equally.
 *
 * Visibility and expected rates are not here. They are settings — who may see
 * the profile, and what the work costs — rather than the profile a buyer reads,
 * and a profile does not become more complete by being hidden.
 *
 * The weights are whole numbers adding to a hundred, so a percentage is a sum
 * rather than a rounding, and the figure on screen can never be 99 with every
 * section done.
 */
export const SECTION_WEIGHTS: Readonly<Record<SectionId, number>> = {
  skills: 20,
  experience: 20,
  portfolio: 20,
  about: 10,
  education: 10,
  certifications: 10,
  videoIntro: 10,
};

/** Which sections the person has filled in. */
export type SectionsFilled = Readonly<Record<SectionId, boolean>>;

export const NOTHING_FILLED: SectionsFilled = {
  about: false,
  skills: false,
  experience: false,
  education: false,
  certifications: false,
  portfolio: false,
  videoIntro: false,
};

/**
 * The rows the strength card lists, as the design writes them.
 *
 * Education and certifications share a row because the design gives them one,
 * while counting separately because they are two sections someone fills in
 * separately: filling one moves the figure by ten, and the row is finished when
 * both are.
 */
const ROWS: readonly { label: string; sections: readonly SectionId[] }[] = [
  { label: 'About section', sections: ['about'] },
  { label: 'Skills & expertise', sections: ['skills'] },
  { label: 'Work experience', sections: ['experience'] },
  { label: 'Education & certifications', sections: ['education', 'certifications'] },
  { label: 'Portfolio', sections: ['portfolio'] },
  { label: 'Add a video intro', sections: ['videoIntro'] },
];

export type CompletionItem = { label: string; done: boolean };

export type Completion = {
  percent: number;
  /** Rows finished, of the rows the card lists — not sections, which are weighted. */
  done: number;
  total: number;
  label: string;
  headline: string;
  items: CompletionItem[];
};

/** What the badge calls a profile at this percentage. */
function labelFor(percent: number): string {
  if (percent === 100) return 'Complete';
  if (percent >= 80) return 'Very strong';
  if (percent >= 50) return 'Strong';
  if (percent >= 25) return 'Getting there';
  return 'Just started';
}

function headlineFor(percent: number): string {
  if (percent === 100) return 'Your profile is market-ready';
  if (percent >= 50) return 'You’re nearly market-ready';
  return 'Let’s make you market-ready';
}

export function completionOf(filled: SectionsFilled): Completion {
  const percent = (Object.keys(SECTION_WEIGHTS) as SectionId[])
    .filter((section) => filled[section])
    .reduce((total, section) => total + SECTION_WEIGHTS[section], 0);

  const items = ROWS.map((row) => ({
    label: row.label,
    done: row.sections.every((section) => filled[section]),
  }));

  return {
    percent,
    done: items.filter((item) => item.done).length,
    total: items.length,
    label: labelFor(percent),
    headline: headlineFor(percent),
    items,
  };
}
