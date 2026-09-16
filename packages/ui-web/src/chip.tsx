import type { ReactNode } from 'react';
import { LuX } from 'react-icons/lu';
import { cn } from './cn.ts';

export type ChipProps = {
  children: ReactNode;
  /** Renders the remove control. Omit for a chip that only labels something. */
  onRemove?: (() => void) | undefined;
  /**
   * The remove button's accessible name. Defaults to "Remove", which is only
   * enough when there is one chip — pass the subject when there are several,
   * so a screen reader hears "Remove English" rather than five "Remove"s.
   */
  removeLabel?: string | undefined;
  className?: string | undefined;
};

export function Chip({ children, onRemove, removeLabel = 'Remove', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-surface-accent-subtle py-1.5 pl-3 text-sm text-content-accent',
        onRemove === undefined ? 'pr-3' : 'pr-1.5',
        className,
      )}
    >
      {children}
      {onRemove === undefined ? null : (
        <button
          type="button"
          onClick={onRemove}
          // A 24px target inside a 32px chip: small, but the chip is a shortcut
          // for something that can also be removed from the editor behind it.
          // `shrink-0` keeps those 24px: in a tight row of chips on a phone,
          // flex was squeezing this below the size a thumb can hit.
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-content-subtle transition-colors hover:bg-accent-muted hover:text-content-accent"
        >
          <LuX aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{removeLabel}</span>
        </button>
      )}
    </span>
  );
}
