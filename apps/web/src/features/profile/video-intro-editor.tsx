'use client';

import { cn } from '@hireevo/ui-web';
import { CONTROL, SetupField } from '@/features/profile-setup/setup-field.tsx';

/**
 * A short introduction video, as a link to where it can be watched.
 *
 * The design asks the person to record one, which needs somewhere to record it
 * and somewhere to put it; neither exists yet. A link is the honest half of it
 * that works today, and the section says plainly that the profile cannot hold
 * it yet — rather than taking a recording and quietly losing it.
 */
export function VideoIntroEditor({
  url,
  onChange,
}: {
  url: string;
  onChange: (url: string) => void;
}) {
  return (
    <div>
      <p className="mb-4 text-xs text-content-subtle">
        Your profile cannot store a video yet, so this link is kept in this browser until it can.
      </p>
      <SetupField
        label="Link to your video"
        hint="A public link to the video — YouTube, Vimeo, or anywhere it can be watched."
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
    </div>
  );
}
