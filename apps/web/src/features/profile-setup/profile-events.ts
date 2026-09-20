'use client';

import type { OwnProfile } from './api.ts';

/**
 * Says, to the rest of the page, that the profile has moved to a new version.
 *
 * Two things on a signed-in page write the profile: the form, and the
 * availability switch in the bar above it. Both write at the version they last
 * read, so whichever writes second would be refused as somebody else's change
 * — which it is not. Rather than one of them owning the other, each announces
 * the version it moved to and the other takes it.
 *
 * Deliberately not React context: the switch lives in the layout and the form
 * in the page, so no provider sits above both without lifting the form's state
 * out of the component that edits it.
 */
type Listener = (profile: OwnProfile) => void;

const listeners = new Set<Listener>();

/** Announces a profile that has just been read or written. */
export function profileChanged(profile: OwnProfile): void {
  for (const listener of [...listeners]) listener(profile);
}

/** Listens until the returned function is called. */
export function onProfileChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
