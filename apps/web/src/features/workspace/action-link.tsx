import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import type { Action } from './types.ts';

/**
 * A text action. With nowhere to go (`href: null`) it renders as quieter plain
 * text marked unavailable — never as a link to nowhere, which is what copying
 * the design literally would produce.
 */
export function ActionLink({
  action,
  arrow = false,
  className,
}: {
  action: Action;
  arrow?: boolean;
  className?: string;
}) {
  if (action.href === null) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-content-subtle', className)}>
        {action.label}
        <span className="sr-only"> (not available yet)</span>
      </span>
    );
  }

  return (
    <Link
      href={action.href}
      className={cn(
        'rounded-sm font-medium text-content-link transition-colors hover:text-content-accent',
        className,
      )}
    >
      <span className="underline underline-offset-4">{action.label}</span>
      {/* Inline, not flex: on a narrow card the label wraps, and the arrow has to
          follow its last word instead of being pinned to the far edge. */}
      {arrow ? (
        <LuArrowRight aria-hidden="true" className="ml-2 inline-block size-4 align-[-0.15em]" />
      ) : null}
    </Link>
  );
}
