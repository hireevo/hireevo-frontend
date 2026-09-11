'use client';

import { useId, useState } from 'react';
import type { ChangeEvent } from 'react';
import { LuCamera, LuUser } from 'react-icons/lu';
import { uploadAvatar } from './api.ts';

const ACCEPT = 'image/png,image/jpeg,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

export type AvatarPickerProps = {
  url: string | null;
  onChange: (url: string) => void;
};

/**
 * The profile photo and the camera button on its corner.
 *
 * The control is a `<label>` over a hidden file input rather than a button that
 * clicks one: that way it is reachable by keyboard and announces itself as a
 * file picker, which a styled button forwarding a click does not.
 */
export function AvatarPicker({ url, onChange }: AvatarPickerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again after a rejection: without this the
    // input holds the old value and picking it a second time fires nothing.
    event.target.value = '';
    if (file === undefined) return;

    if (file.size > MAX_BYTES) {
      setError('That image is over 5MB. Choose a smaller one.');
      return;
    }
    setError(null);
    const result = await uploadAvatar(file);
    onChange(result.url);
  }

  return (
    <div className="shrink-0">
      <div className="relative size-19">
        <span className="flex size-19 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
          {url === null ? (
            <LuUser aria-hidden="true" className="size-9 text-content-subtle" />
          ) : (
            // Not `next/image`: the source is an object URL for a file the
            // browser already holds, and there is nothing for the optimiser to
            // fetch or resize.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-full object-cover" />
          )}
        </span>

        <label
          htmlFor={inputId}
          className="absolute right-0 bottom-0 flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-surface bg-accent text-content-on-accent transition-colors hover:bg-accent-hover focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
        >
          <LuCamera aria-hidden="true" className="size-3.5" />
          <span className="sr-only">
            {url === null ? 'Add a profile photo' : 'Change your profile photo'}
          </span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPT}
            onChange={(event) => void handleChange(event)}
            {...(error === null ? {} : { 'aria-describedby': errorId })}
            className="sr-only"
          />
        </label>
      </div>

      {error === null ? null : (
        <p id={errorId} role="alert" className="mt-2 w-40 text-xs text-content-danger">
          {error}
        </p>
      )}
    </div>
  );
}
