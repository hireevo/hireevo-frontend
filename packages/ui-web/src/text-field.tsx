import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn.ts';
import { Field, type FieldOwnProps } from './field.tsx';

/**
 * The shared shell: border, height and radius are the same for every control.
 * The design's 54px unless a screen short on height sets `--field-height`.
 */
export const inputShell = [
  'flex h-[var(--field-height,54px)] w-full items-center rounded-lg border bg-transparent',
  'transition-colors focus-within:border-border-accent',
];

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> &
  FieldOwnProps & {
    /** Rendered flush to the trailing edge, behind a divider — e.g. a reveal toggle. */
    adornment?: ReactNode;
    className?: string | undefined;
  };

export function TextField({
  label,
  hideLabel,
  error,
  hint,
  adornment,
  className,
  ...input
}: TextFieldProps) {
  return (
    <Field label={label} hideLabel={hideLabel} error={error} hint={hint} className={className}>
      {(control) => (
        <span
          className={cn(
            inputShell,
            error === undefined ? 'border-border' : 'border-border-danger',
            input.disabled === true && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            {...input}
            {...control}
            className="min-w-0 flex-1 bg-transparent px-3 text-base text-content outline-none placeholder:text-content-subtle disabled:cursor-not-allowed"
          />
          {adornment === undefined ? null : (
            <span className="flex h-10 items-center border-l border-border pr-2 pl-0.5">
              {adornment}
            </span>
          )}
        </span>
      )}
    </Field>
  );
}
