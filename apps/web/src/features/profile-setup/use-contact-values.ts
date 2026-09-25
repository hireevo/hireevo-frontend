'use client';

import { useCallback, useRef, useState } from 'react';
import {
  EMPTY_CONTACT,
  contactOf,
  type ContactField,
  type ContactValues,
  type OwnProfile,
} from './api.ts';

/**
 * The contact fields, held where the card that edits them can reach them.
 *
 * Kept beside the draft hook rather than inside it, for the reason the lists
 * are: what a save has to send is whatever this holds at the moment the request
 * goes out, and `collect` is how the draft reads that without owning it.
 *
 * Seeded when the profile first arrives and again only if a different profile
 * does. A save returns a new profile object every time, and re-seeding on that
 * would throw away whatever had been typed since the request left.
 */
export function useContactValues() {
  const [values, setValues] = useState<ContactValues>(EMPTY_CONTACT);
  const latest = useRef(EMPTY_CONTACT);
  const seeded = useRef<string | null>(null);

  /**
   * Fills the fields from a profile the first time that profile arrives.
   *
   * Called from an effect rather than during render, and ignored for a profile
   * already seeded: every save returns a new profile object, and re-seeding on
   * one would throw away whatever had been typed since the request left.
   */
  const seed = useCallback((profile: OwnProfile | null) => {
    if (profile === null || seeded.current === profile.id) return;
    seeded.current = profile.id;
    const held = contactOf(profile);
    latest.current = held;
    setValues(held);
  }, []);

  const change = useCallback((field: ContactField, value: string) => {
    latest.current = { ...latest.current, [field]: value };
    setValues(latest.current);
  }, []);

  /** Stable, so the draft hook's effect does not re-run on every keystroke. */
  const collect = useCallback(() => latest.current, []);

  return { values, change, collect, seed };
}
