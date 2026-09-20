'use client';

import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { LuCamera, LuUser } from 'react-icons/lu';
import { ACCEPT, uploadProfilePhoto } from '@/features/media/upload.ts';

export type ChosenPhoto = {
  /** What to show it from until the profile is saved and the server names one. */
  url: string;
  /** What the next save claims. */
  key: string;
};

export type AvatarPickerProps = {
  url: string | null;
  onChange: (photo: ChosenPhoto) => void;
  /**
   * False until "Complete your profile" turns editing on, which hides the
   * camera: the profile is read before it is written, and a control that
   * uploads on click does not belong on a page that is being read.
   */
  editable?: boolean;
};

/**
 * The profile photo and the camera button on its corner.
 *
 * The control is a `<label>` over a hidden file input rather than a button that
 * clicks one: that way it is reachable by keyboard and announces itself as a
 * file picker, which a styled button forwarding a click does not.
 *
 * Choosing a photo uploads it straight to storage — the bytes never go through
 * the API, which only signs the upload. What comes back is a key, and the
 * profile claims it on its next save; a photo uploaded by someone who then
 * leaves the page changes nothing. Until that save the picture on screen is the
 * browser's own copy of the file, so the photo appears at once rather than
 * after a round trip.
 */
export function AvatarPicker({ url, onChange, editable = true }: AvatarPickerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a rejection: without this the
    // input holds the old value and picking it a second time fires nothing.
    event.target.value = '';
    if (file === undefined) return;

    setError(null);
    setBusy(true);
    // Re-encoded in this tab before anything is sent: a photo straight off a
    // phone is several megabytes, and what a 76-pixel avatar needs is not.
    const result = await uploadProfilePhoto(file);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChange({ url: URL.createObjectURL(file), key: result.value });
  }

  return (
    <div className="shrink-0">
      <div className="relative size-19">
        <span className="flex size-19 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
          {url === null ? (
            <LuUser aria-hidden="true" className="size-9 text-content-subtle" />
          ) : (
            // Not `next/image`: this is either the browser's own copy of a file
            // it already holds or a URL from object storage, and neither is
            // something the optimiser can fetch and resize.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          )}
        </span>

        {!editable ? null : (
          <label
            htmlFor={inputId}
            className="absolute right-0 bottom-0 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-accent text-content-on-accent transition-colors hover:bg-accent-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
          >
            <LuCamera aria-hidden="true" className="size-3.5" />
            <span className="sr-only">
              {busy
                ? 'Uploading your profile photo'
                : url === null
                  ? 'Add a profile photo'
                  : 'Change your profile photo'}
            </span>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT.image}
              disabled={busy}
              onChange={(event) => void handleChange(event)}
              {...(error === null ? {} : { 'aria-describedby': errorId })}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {/* Polite while it is working, assertive when it failed: one is progress,
          the other is something the person has to act on. */}
      {busy ? (
        <p role="status" className="mt-2 w-40 text-xs text-content-subtle">
          Uploading…
        </p>
      ) : null}
      {error === null ? null : (
        <p id={errorId} role="alert" className="mt-2 w-40 text-xs text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}
