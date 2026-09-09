'use client';

import { useState } from 'react';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { TextField, type TextFieldProps } from './text-field.tsx';

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'adornment'>;

/**
 * A password input with a reveal toggle. The toggle is a real `<button>` rather
 * than an icon with a click handler so it can be reached and operated from the
 * keyboard, and its accessible name changes with the state — announcing
 * "show password" while the password is already visible is worse than silence.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const Icon = revealed ? AiFillEyeInvisible : AiFillEye;

  return (
    <TextField
      {...props}
      type={revealed ? 'text' : 'password'}
      adornment={
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          className="flex size-10 items-center justify-center rounded-sm text-content-subtle transition-colors hover:text-content"
        >
          <Icon aria-hidden="true" className="size-6" />
          <span className="sr-only">{revealed ? 'Hide password' : 'Show password'}</span>
        </button>
      }
    />
  );
}
