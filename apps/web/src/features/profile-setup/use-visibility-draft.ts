'use client';

import { useEffect, useRef, useState } from 'react';
import { loadOrCreateProfile, saveVisibility, type OwnProfile } from './api.ts';

/** In the order the design lists them, row by row across its two columns. */
export const PUBLIC_SECTIONS = [
  { id: 'nameHeadline', label: 'Name and headline' },
  { id: 'biography', label: 'About' },
  { id: 'location', label: 'Location and remote preference' },
  { id: 'languages', label: 'Languages' },
  // One flag for all three periods: somebody who shows an hourly rate and hides
  // the monthly one is describing the same price twice.
  { id: 'rate', label: 'Expected rates' },
  { id: 'skills', label: 'Skills and expertise' },
  { id: 'experience', label: 'Work experience' },
  { id: 'education', label: 'Education' },
  { id: 'licenses', label: 'Certifications' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'videoIntro', label: 'Video intro' },
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
  // Shown, matching the column defaults: a profile is private until it is
  // published, and what publishing then shows is what the person filled in.
  // This is only what the step holds in the moment before the profile arrives —
  // the server's own answer replaces it — but the moment is visible, and a
  // flash of twelve unticked boxes says the opposite of what is true.
  sections: Object.fromEntries(PUBLIC_SECTIONS.map((section) => [section.id, true])) as Record<
    PublicSection,
    boolean
  >,
  indexable: false,
};

export const NO_PUBLIC_SECTIONS = 'Choose at least one section to show on your public profile.';

/** What the server holds, in the shape this step shows. */
function valuesOf(profile: OwnProfile): VisibilityValues {
  const stored = profile.visibility;
  return {
    mode: stored.profilePublic ? 'public' : 'private',
    sections: { ...stored.sections },
    indexable: stored.searchIndexable,
  };
}

/**
 * Who sees the profile once it is published.
 *
 * It starts private and not indexed: nothing is public until the person
 * publishes. What publishing shows is every section they filled in, which is
 * what these switches start on and what unticking one takes away.
 *
 * Saving sends the whole setting at the profile's version, like every other
 * write to it. The answer does not carry the new version — the setting is all
 * it returns — so the profile is read again afterwards and handed back to the
 * draft. Without that, the next save of the fields would be sent at a version
 * this write had already moved past, and refused as somebody else's change.
 */
export function useVisibilityDraft(draft: {
  profile: OwnProfile | null;
  version: () => number;
  flush: () => Promise<boolean>;
  adopt: (profile: OwnProfile) => void;
}) {
  const [values, setValues] = useState<VisibilityValues>(DEFAULT_VISIBILITY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Seeded once, from the profile the page loaded. Re-seeding on every change
  // would undo what is being ticked while a save is on its way.
  const seeded = useRef(false);
  const { profile } = draft;
  useEffect(() => {
    if (seeded.current || profile === null) return;
    seeded.current = true;
    setValues(valuesOf(profile));
  }, [profile]);

  function edited() {
    setError(null);
    setSaved(false);
  }

  return {
    values,
    error,
    saving,
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

    /** Saves the setting unless a public profile would show nothing. */
    async save(): Promise<boolean> {
      if (values.mode === 'public' && !Object.values(values.sections).some(Boolean)) {
        setError(NO_PUBLIC_SECTIONS);
        return false;
      }

      setSaving(true);
      try {
        // The fields first: both writes carry the version, and whichever went
        // second would be refused as a conflict with the first.
        if (!(await draft.flush())) {
          setError('Your other changes could not be saved, so this setting was not sent.');
          return false;
        }

        const current = draft.profile?.visibility.locationGranularity ?? 'hidden';
        const result = await saveVisibility({
          version: draft.version(),
          profilePublic: values.mode === 'public',
          // There is no control for how precisely the location is shown. Showing
          // the section at all has to mean showing something, so a profile that
          // has never chosen starts at the country — the coarsest answer that is
          // not "nothing".
          locationGranularity:
            values.sections.location && current === 'hidden' ? 'country' : current,
          sections: { ...values.sections },
          searchIndexable: values.indexable,
        });

        if (!result.ok) {
          setError(result.message);
          return false;
        }

        // Read back for the version this write moved the profile to.
        const reloaded = await loadOrCreateProfile();
        if (reloaded.ok) draft.adopt(reloaded.profile);

        setSaved(true);
        return true;
      } finally {
        setSaving(false);
      }
    },
  };
}

export type VisibilityDraft = ReturnType<typeof useVisibilityDraft>;
