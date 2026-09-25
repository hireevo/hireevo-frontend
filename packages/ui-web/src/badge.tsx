import type { ReactNode } from 'react';
import { cn } from './cn.ts';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning';

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone | undefined;
  /**
   * `pill` is the tinted capsule; `solid` is the filled one the design uses
   * where a status is the loudest thing in its row ("Verified"); `text` is the
   * bare coloured word a card's corner carries ("Published", "Draft").
   */
  variant?: 'pill' | 'solid' | 'text' | undefined;
  /** Decorative. Hidden from assistive technology — the words carry the meaning. */
  icon?: ReactNode;
  className?: string | undefined;
};

const PILL: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-content-accent',
  accent: 'bg-surface-accent-subtle text-content-link',
  success: 'bg-surface-success-subtle text-content-success',
  warning: 'bg-surface-warning-subtle text-content-warning',
};

const SOLID: Record<BadgeTone, string> = {
  neutral: 'bg-surface-inverse text-content-inverse',
  accent: 'bg-surface-accent text-content-on-accent',
  success: 'bg-surface-success-subtle text-content-success',
  warning: 'bg-surface-warning text-content-on-warning',
};

const TEXT: Record<BadgeTone, string> = {
  neutral: 'text-content-subtle',
  accent: 'text-content-link',
  success: 'text-content-success',
  warning: 'text-content-warning',
};

/**
 * A short status or fact. Tone only ever restates what the words already say —
 * "Draft" is orange and also reads "Draft" — so nothing depends on seeing colour.
 */
export function Badge({
  children,
  tone = 'neutral',
  variant = 'pill',
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        'inline-flex max-w-full min-w-0 items-center gap-1.5 text-[0.8125rem] leading-5 font-medium',
        variant === 'text'
          ? TEXT[tone]
          : ['rounded-full px-3 py-1', variant === 'solid' ? SOLID[tone] : PILL[tone]],
        className,
      )}
    >
      {icon === undefined ? null : (
        <span aria-hidden="true" className="flex shrink-0 [&>svg]:size-3.5">
          {icon}
        </span>
      )}
      {/* Truncates rather than pushing the card wider on a narrow phone. */}
      <span className="truncate">{children}</span>
    </span>
  );
}
