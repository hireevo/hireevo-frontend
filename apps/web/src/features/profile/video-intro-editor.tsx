'use client';

import { useState } from 'react';
import { cn } from '@hireevo/ui-web';
import type { FieldErrors } from '@/features/profile-setup/api.ts';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';
import { validateVideoUrl } from './video-url.ts';

/**
 * A short introduction video, as a link to where it can be watched.
 *
 * The design asks the person to record one, which needs somewhere to record it
 * and somewhere to put it; neither exists yet, and freelancers already keep a
 * showreel somewhere. A link is the half of it that works today, and it is
 * saved with the rest of the profile.
 *
 * The API accepts only `http` and `https`, and says so when it refuses: what is
 * stored here is shown as a link, and a link a browser would execute instead of
 * follow is somebody else's script running on this profile. The same rule is
 * checked here as the person types — once they leave the field — so a mistyped
 * link is caught immediately rather than only when the save comes back, and with
 * the same words either way.
 */
export function VideoIntroEditor({
  url,
  fieldErrors,
  onChange,
}: {
  url: string;
  fieldErrors: FieldErrors;
  onChange: (url: string) => void;
}) {
  // Not validated on every keystroke: a half-typed "https:/" is not a mistake
  // to shout about while it is still being typed. The check runs once the person
  // leaves the field, and clears the moment the value becomes valid again.
  const [touched, setTouched] = useState(false);

  // The server's answer wins when there is one — it saw the value this browser
  // sent — and the local check fills the gap before the first save.
  const error =
    fieldErrors.videoIntroUrl ?? (touched ? (validateVideoUrl(url) ?? undefined) : undefined);

  return (
    <SetupField
      label="Link to your video"
      hint="A public link to the video — YouTube, Vimeo, or anywhere it can be watched."
      error={error}
    >
      {(control) => (
        <input
          {...control}
          name="videoIntroUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          value={url}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setTouched(true)}
          className={cn(CONTROL, 'h-10')}
        />
      )}
    </SetupField>
  );
}
