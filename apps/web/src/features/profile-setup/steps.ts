import type { Route } from 'next';

export type StepId = 'identity' | 'location' | 'skills' | 'experience' | 'education' | 'visibility';

export type Step = { id: StepId; number: number; label: string; title: string };

/** The six sections of profile setup, in the order the design lists them. */
export const STEPS: readonly Step[] = [
  { id: 'identity', number: 1, label: 'Identity & story', title: 'Identity and story' },
  { id: 'location', number: 2, label: 'Location & rate', title: 'Location and rate' },
  { id: 'skills', number: 3, label: 'Languages & skills', title: 'Languages and skills' },
  { id: 'experience', number: 4, label: 'Experience', title: 'Experience' },
  { id: 'education', number: 5, label: 'Education & licenses', title: 'Education and licenses' },
  {
    id: 'visibility',
    number: 6,
    label: 'Visibility & publication',
    title: 'Visibility and publication',
  },
];

export function stepFor(id: string | null): Step {
  return STEPS.find((step) => step.id === id) ?? (STEPS[0] as Step);
}

/** The first step lives at the bare URL; the rest are named in the query string. */
export function hrefFor(id: StepId): Route {
  return id === 'identity' ? '/profile/setup' : `/profile/setup?step=${id}`;
}

/**
 * Which step each field the API can complain about belongs to, so a publish
 * failure can send the person to the section that fixes it.
 */
export const FIELD_STEP: Readonly<Record<string, StepId>> = {
  displayName: 'identity',
  headline: 'identity',
  overview: 'identity',
  availabilityNote: 'identity',
  locationCountry: 'location',
  locationRegion: 'location',
  locationCity: 'location',
  rateAmountMinor: 'location',
  rateCurrency: 'location',
  availability: 'visibility',
};
