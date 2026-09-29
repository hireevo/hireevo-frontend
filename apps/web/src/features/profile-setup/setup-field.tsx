import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@hireevo/ui-web';

/** How close to the limit a field gets before it starts counting down. */
const COUNT_FROM = 20;

export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

/**
 * A labelled field in the design's compact form style: the label on the left,
 * "Optional" on the right, the hint or error underneath.
 *
 * The countdown appears only near the limit. `maxLength` alone silently stops
 * accepting keystrokes, which reads as a broken keyboard; a counter visible the
 * whole time would clutter a form that is mostly nowhere near the limit.
 */
export function SetupField({
  label,
  optional = true,
  required = false,
  note,
  hint,
  error,
  length,
  max,
  alwaysCount = false,
  hideLabel = false,
  className,
  children,
}: {
  label: string;
  optional?: boolean;
  /**
   * Draws the design's red asterisk. Separate from `optional`, which only says
   * whether to show the "Optional" chip — the two screens that already turn
   * that chip off do not want an asterisk in its place.
   */
  required?: boolean;
  /** A grey aside beside the label, e.g. "(with country code)". */
  note?: string;
  hint?: string;
  error?: string | undefined;
  /** With `max`, turns on the countdown near the limit. */
  length?: number;
  max?: number;
  /**
   * Shows the count the whole time as `used / max`, not only near the limit.
   * For a field whose limit is part of the ask — the biography's thousand — so
   * the number is there to watch from the first keystroke.
   */
  alwaysCount?: boolean;
  /**
   * Keeps the label for assistive technology but takes it off the screen, for a
   * field whose card already names it — the About card's biography, where a
   * "Biography" heading under an "About" heading is the same word twice.
   */
  hideLabel?: boolean;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const counted = max !== undefined && length !== undefined;
  const remaining = counted ? max - length : Infinity;
  const showCount = counted && (alwaysCount || remaining <= COUNT_FROM);
  const describedBy =
    [error === undefined ? null : errorId, hint === undefined && !showCount ? null : hintId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={id} className="text-[0.8125rem] font-medium text-content">
            {label}
            {required ? (
              <>
                {' '}
                {/* Announced, not only coloured: "required" is the part a screen
                  reader has to hear, and the asterisk alone says nothing. */}
                <span aria-hidden="true" className="text-content-warning">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </>
            ) : null}
            {note === undefined ? null : (
              <span className="ml-1 font-normal text-content-subtle">{note}</span>
            )}
          </label>
          {optional ? <span className="text-xs text-content-subtle">Optional</span> : null}
        </div>
      )}
      <div className="mt-1.5">
        {children({
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error === undefined ? undefined : true,
        })}
      </div>
      {error === undefined ? null : (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-content-warning">
          {error}
        </p>
      )}
      {hint === undefined && !showCount ? null : (
        <p id={hintId} className="mt-1.5 flex justify-between gap-3 text-xs text-content-subtle">
          <span>{hint}</span>
          {showCount ? (
            <span
              className={cn('shrink-0 tabular-nums', remaining === 0 && 'text-content-warning')}
            >
              {alwaysCount
                ? `${length} / ${max}`
                : `${remaining} ${remaining === 1 ? 'character' : 'characters'} left`}
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

/** Shared control styling, so inputs and textareas line up. */
export const CONTROL =
  'w-full rounded-md border bg-surface px-3 text-sm text-content outline-none transition-colors placeholder:text-content-subtle focus:border-border-accent';
