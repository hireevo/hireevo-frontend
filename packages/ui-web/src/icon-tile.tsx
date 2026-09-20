import type { ReactNode } from 'react';
import { cn } from './cn.ts';

export type IconTileProps = {
  children: ReactNode;
  className?: string | undefined;
};

/**
 * The illustration that sits opposite a section's copy: a tinted square with a
 * raised white one inside it holding the icon.
 *
 * It is decoration, so it is hidden from assistive technology — the section's
 * heading already says what the card is, and "star" read out beside "Skills and
 * expertise" is noise rather than information.
 */
export function IconTile({ children, className }: IconTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-25 shrink-0 items-center justify-center rounded-2xl bg-surface-muted',
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-xl bg-surface text-accent shadow-sm [&>svg]:size-6">
        {children}
      </span>
    </span>
  );
}
