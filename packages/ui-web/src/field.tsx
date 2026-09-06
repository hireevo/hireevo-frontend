import { useId } from 'react';
import type { ReactNode } from 'react';
import { cn } from './cn.ts';

export type FieldOwnProps = {
  /** Visible label. Always rendered — a placeholder is not a label. */
  label: string;
  /** Replaces the label text with a screen-reader-only one. */
  hideLabel?: boolean | undefined;
  /** Marks the control invalid and shows the message beneath it. */
  error?: string | undefined;
  /** Supporting copy shown beneath the control while it is valid. */
  hint?: string | undefined;
};

export type FieldControl = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

type FieldProps = FieldOwnProps & {
  /** Receives the ids the control must carry for the label and message to apply. */
  children: (control: FieldControl) => ReactNode;
  className?: string | undefined;
};

/**
 * Label, control and message as one unit. The ids are generated here and handed
 * to the control rather than left to the caller, because a label that has
 * quietly stopped pointing at its input still looks correct on screen — the
 * only place the mistake shows up is in a screen reader.
 */
export function Field({ label, hideLabel, error, hint, children, className }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        htmlFor={id}
        // The 10px inset is the design's: labels sit slightly proud of the
        // input's own text padding rather than flush with its border.
        className={cn(
          'pl-2.5 text-sm leading-5 text-content-subtle',
          hideLabel === true && 'sr-only',
          // 20px of label plus 14px of gap is the design's 34px from the top of
          // the label to the top of the control.
          hideLabel !== true && 'mb-3.5',
        )}
      >
        {label}
      </label>
      {children({
        id,
        'aria-describedby': message === undefined ? undefined : messageId,
        'aria-invalid': error === undefined ? undefined : true,
      })}
      {message === undefined ? null : (
        <p
          id={messageId}
          // `role="alert"` only on the error: announcing a static hint the
          // moment it renders interrupts the user for no reason.
          {...(error === undefined ? {} : { role: 'alert' })}
          className={cn(
            'mt-1.5 pl-2.5 text-sm',
            error === undefined ? 'text-content-subtle' : 'text-content-warning',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
