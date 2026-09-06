import type { InputHTMLAttributes, ReactNode } from 'react';
import { AiOutlineCheck } from 'react-icons/ai';
import { cn } from './cn.ts';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'> & {
  children: ReactNode;
  className?: string;
};

/**
 * The native control stays in the accessibility tree and is only restyled with
 * `appearance-none`, so keyboard operation, form participation and the
 * indeterminate state all still come from the browser rather than from us. The
 * tick is drawn over it and is `pointer-events-none`, so every click still
 * lands on the input underneath.
 */
export function Checkbox({ children, className, ...input }: CheckboxProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm', className)}>
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <input
          {...input}
          type="checkbox"
          className="peer size-4 appearance-none rounded-sm border border-border bg-transparent transition-colors checked:border-accent checked:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        />
        <AiOutlineCheck
          aria-hidden="true"
          className="pointer-events-none absolute size-3 text-content-on-accent opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className="text-content-subtle">{children}</span>
    </label>
  );
}
