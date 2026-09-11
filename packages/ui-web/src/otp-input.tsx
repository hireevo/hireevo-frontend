'use client';

import { useId, useRef } from 'react';
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react';
import { cn } from './cn.ts';

export type OtpInputProps = {
  /** The code so far. Shorter than `length` while incomplete. */
  value: string;
  onChange: (value: string) => void;
  /** Announced for the group as a whole; each box is numbered from it. */
  label: string;
  length?: number;
  disabled?: boolean;
  /** Marks every box invalid and is forwarded to the boxes for assistive tech. */
  invalid?: boolean;
  /** Ties the group to an external error message. */
  'aria-describedby'?: string;
  className?: string;
};

const DIGITS = /\d/g;

/**
 * A one-box-per-digit verification code entry.
 *
 * The boxes are separate inputs because that is what makes the caret land in
 * the right place on every browser, but the *value* is one string: splitting it
 * into six pieces of state is how a pasted code ends up in the first box only.
 */
export function OtpInput({
  value,
  onChange,
  label,
  length = 6,
  disabled = false,
  invalid = false,
  'aria-describedby': describedBy,
  className,
}: OtpInputProps) {
  const groupId = useId();
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const focusBox = (index: number) => {
    const box = boxes.current[Math.min(Math.max(index, 0), length - 1)];
    box?.focus();
    box?.select();
  };

  /** Replaces one position and trims anything the edit orphaned. */
  const write = (index: number, digits: string) => {
    const next = (value.slice(0, index) + digits + value.slice(index + digits.length))
      .slice(0, length)
      .replace(/\D/g, '');
    onChange(next);
    return next;
  };

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    // A box holding a digit is `select()`ed on focus, so typing replaces it;
    // typing into an empty box appends. Either way only digits survive.
    const digits = event.target.value.match(DIGITS)?.join('') ?? '';
    if (digits === '') {
      // Clearing a box drops it and everything after it: the value is one
      // string, so leaving a hole in the middle would silently shift digits.
      onChange(value.slice(0, index));
      return;
    }
    write(index, digits);
    focusBox(index + digits.length);
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && (value[index] ?? '') === '' && index > 0) {
      // Nothing here to delete, so take the previous digit instead — otherwise
      // backspace on an empty box looks broken.
      event.preventDefault();
      onChange(value.slice(0, index - 1));
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusBox(index - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    const digits = event.clipboardData.getData('text').match(DIGITS)?.join('') ?? '';
    if (digits === '') return;
    event.preventDefault();
    const next = write(index, digits);
    focusBox(next.length);
  };

  return (
    <div
      role="group"
      aria-label={label}
      {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
      className={cn('flex w-full max-w-[410px] gap-2 sm:gap-2.5', className)}
    >
      {Array.from({ length }, (_, index) => (
        <input
          key={`${groupId}-${index}`}
          ref={(node) => {
            boxes.current[index] = node;
          }}
          value={value[index] ?? ''}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={handlePaste(index)}
          onFocus={(event) => event.target.select()}
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          className={cn(
            // Six boxes share whatever width the screen has, never wider than the
            // design's 60px: on a 320px phone that is ~39px each, still a
            // comfortable target, instead of 410px of boxes pushing the page sideways.
            'aspect-square h-auto min-w-0 flex-1 max-w-15 rounded-md border bg-transparent text-center text-xl text-content',
            'transition-colors focus:border-border-accent focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-60',
            invalid ? 'border-border-danger' : 'border-border',
          )}
        />
      ))}
    </div>
  );
}
