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
  hint,
  error,
  length,
  max,
  className,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string | undefined;
  length: number;
  max: number;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const remaining = max - length;
  const counting = remaining <= COUNT_FROM;
  const describedBy =
    [error === undefined ? null : errorId, hint === undefined && !counting ? null : hintId]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-content">
          {label}
        </label>
        {optional ? <span className="text-xs text-content-subtle">Optional</span> : null}
      </div>
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
      {hint === undefined && !counting ? null : (
        <p id={hintId} className="mt-1.5 flex justify-between gap-3 text-xs text-content-subtle">
          <span>{hint}</span>
          {counting ? (
            <span className={cn('shrink-0', remaining === 0 && 'text-content-warning')}>
              {remaining} {remaining === 1 ? 'character' : 'characters'} left
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
