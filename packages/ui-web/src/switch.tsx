import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn.ts';

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'role' | 'onChange' | 'onClick' | 'aria-checked'
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/**
 * An on/off setting that takes effect at once — "Available" — as opposed to a
 * checkbox, which is part of a form submitted later.
 *
 * It is a real `<button role="switch">`, so Space and Enter work with no key
 * handling here. It has no visible text of its own and must be named: pass
 * `aria-label`, or `aria-labelledby` pointing at the words beside it.
 */
export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-fast',
        checked ? 'bg-accent' : 'bg-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-5 rounded-full bg-surface shadow-sm transition-transform duration-fast ease-standard',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
