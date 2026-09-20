'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadOrCreateProfile, saveAvailability, type OwnProfile } from './api.ts';
import { onProfileChanged, profileChanged } from './profile-events.ts';

/**
 * What the bar at the top of a signed-in page says about the profile: whether
 * it is live, and whether its owner is taking work.
 *
 * The switch has two positions and the field has three: on is "available", off
 * is "unavailable", and "open to offers" — which the API allows — cannot be
 * reached from here. Anything that is not explicitly unavailable shows as on,
 * so the middle state reads as "yes, talk to me", which is what it means.
 *
 * It reads the profile itself rather than waiting to be handed one, because the
 * bar sits above every signed-in page including those with no profile form on
 * them. Where there is a form, the two keep each other's version current
 * through profile-events.ts rather than refusing each other's writes.
 */
export function useAvailability() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);

  const take = useCallback((next: OwnProfile) => {
    version.current = next.version;
    setProfile(next);
  }, []);

  useEffect(() => {
    let active = true;
    void loadOrCreateProfile().then((result) => {
      if (!active || !result.ok) return;
      take(result.profile);
      profileChanged(result.profile);
    });
    return () => {
      active = false;
    };
  }, [take]);

  // The form on the page writes the same profile; when it does, take the
  // version it moved to, so the next toggle is not refused as a conflict.
  useEffect(
    () =>
      onProfileChanged((next) => {
        if (next.version <= version.current) return;
        take(next);
      }),
    [take],
  );

  const set = useCallback(
    async (next: boolean) => {
      if (profile === null) return;
      const wanted = next ? 'available' : 'unavailable';

      setSaving(true);
      setError(null);
      // Moved at once: a switch that waits for a round trip before it moves
      // reads as broken. It goes back if the write is refused.
      setProfile({ ...profile, availability: wanted });

      const result = await saveAvailability(version.current, wanted);
      setSaving(false);

      if (result.ok) {
        take(result.profile);
        profileChanged(result.profile);
        return;
      }

      setProfile(profile);
      setError(result.message);
    },
    [profile, take],
  );

  return {
    /** The switch's position. Off only where the profile says so explicitly. */
    on: profile?.availability !== 'unavailable',
    /** Whether the profile is actually published, rather than what a fixture said. */
    published: profile?.status === 'published',
    /** False until the profile has answered, so the switch cannot be moved blind. */
    ready: profile !== null,
    saving,
    error,
    set,
  };
}

export type AvailabilityControl = ReturnType<typeof useAvailability>;
