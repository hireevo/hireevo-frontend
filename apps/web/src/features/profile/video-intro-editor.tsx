'use client';

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
 * checked here as the person types — live, so the moment the field holds
 * something that is not a valid link they are told, rather than finding out only
 * when the save comes back, and with the same words either way. An empty field
 * says nothing: the video is optional.
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
  // The server's answer wins when there is one — it saw the value this browser
  // sent — and the live check catches a bad link before any save. `validateVideoUrl`
  // returns null for an empty field, so nothing is flagged until something is typed.
  const error = fieldErrors.videoIntroUrl ?? validateVideoUrl(url) ?? undefined;

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
          className={cn(CONTROL, 'h-10')}
        />
      )}
    </SetupField>
  );
}
