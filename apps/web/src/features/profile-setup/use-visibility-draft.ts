'use client';

import { useState } from 'react';

/** In the order the design lists them, row by row across its two columns. */
export const PUBLIC_SECTIONS = [
  { id: 'nameHeadline', label: 'Name and headline' },
  { id: 'biography', label: 'Biography' },
  { id: 'location', label: 'Location and remote preference' },
  { id: 'languages', label: 'Languages' },
  { id: 'rate', label: 'Hourly rate' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' },
  { id: 'licenses', label: 'Licenses' },
  { id: 'availability', label: 'Availability' },
] as const;

export type PublicSection = (typeof PUBLIC_SECTIONS)[number]['id'];
export type VisibilityMode = 'private' | 'public';
export type VisibilityValues = {
  mode: VisibilityMode;
  sections: Readonly<Record<PublicSection, boolean>>;
  indexable: boolean;
};

export const DEFAULT_VISIBILITY: VisibilityValues = {
  mode: 'private',
  sections: Object.fromEntries(PUBLIC_SECTIONS.map((section) => [section.id, false])) as Record<
    PublicSection,
    boolean
  >,
  indexable: false,
};

export const NO_PUBLIC_SECTIONS = 'Choose at least one section to show on your public profile.';

/**
 * Who sees the profile once published, held in the page like the other sections
 * that are not connected yet.
 *
 * It starts private, with nothing shared and no indexing: the step promises that
 * publishing uses only what is explicitly marked public, so nothing is marked
 * for the person.
 */
export function useVisibilityDraft() {
  const [values, setValues] = useState<VisibilityValues>(DEFAULT_VISIBILITY);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function edited() {
    setError(null);
    setSaved(false);
  }

  return {
    values,
    error,
    saved,
    setMode(mode: VisibilityMode) {
      setValues((current) => ({ ...current, mode }));
      edited();
    },
    setIndexable(indexable: boolean) {
      setValues((current) => ({ ...current, indexable }));
      edited();
    },
    toggle(section: PublicSection, on: boolean) {
      setValues((current) => ({ ...current, sections: { ...current.sections, [section]: on } }));
      edited();
    },
    /** Accepts the section unless a public profile would show nothing. */
    save(): boolean {
      if (values.mode === 'public' && !Object.values(values.sections).some(Boolean)) {
        setError(NO_PUBLIC_SECTIONS);
        return false;
      }
      setSaved(true);
      return true;
    },
    dirty:
      values.mode !== 'private' || values.indexable || Object.values(values.sections).some(Boolean),
  };
}

export type VisibilityDraft = ReturnType<typeof useVisibilityDraft>;
