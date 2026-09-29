import { REMOTE_MODES } from './location-options.ts';

/**
 * How quickly this person undertakes to reply.
 *
 * Their own commitment, in their own words, and labelled as one: nothing on
 * this platform counts messages yet, so a line reading "responds in 2 hours"
 * beside a measured-looking figure would be a claim nothing backs.
 */
export const RESPONSE_TIMES = [
  { value: 'within_hours', label: 'Within a few hours' },
  { value: 'within_a_day', label: 'Within a day' },
  { value: 'within_two_days', label: 'Within two days' },
  { value: 'within_a_week', label: 'Within a week' },
] as const;

/** The size of engagement someone is looking for, shortest first. */
export const PROJECT_LENGTHS = [
  { value: 'under_a_month', label: 'Under a month' },
  { value: 'one_to_three_months', label: '1–3 months' },
  { value: 'three_to_six_months', label: '3–6 months' },
  { value: 'over_six_months', label: 'Over six months' },
  { value: 'ongoing', label: 'Ongoing' },
] as const;

/** The three enums by value, for the places that show what was chosen. */
export const labelOfResponseTime = (value: string): string =>
  RESPONSE_TIMES.find((option) => option.value === value)?.label ?? value;
export const labelOfProjectLength = (value: string): string =>
  PROJECT_LENGTHS.find((option) => option.value === value)?.label ?? value;
export const labelOfRemoteMode = (value: string): string =>
  REMOTE_MODES.find((option) => option.value === value)?.label ?? value;

/**
 * The same choice as a phrase a reader meets cold on a profile.
 *
 * "3–6 months" is an answer to a question the buyer never saw, so the public
 * page says "3–6 month projects" instead: the label reads as an option in a
 * form, the phrase reads as a sentence about the person.
 */
const PROJECT_LENGTH_PHRASE: Record<string, string> = {
  under_a_month: 'Projects under a month',
  one_to_three_months: '1–3 month projects',
  three_to_six_months: '3–6 month projects',
  over_six_months: 'Projects over six months',
  ongoing: 'Ongoing work',
};

export const phraseOfProjectLength = (value: string): string =>
  PROJECT_LENGTH_PHRASE[value] ?? labelOfProjectLength(value);
