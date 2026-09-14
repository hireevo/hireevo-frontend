import Link from 'next/link';
import { LuArrowRight } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import type { Action } from './types.ts';

/**
 * A text action, underlined with an optional arrow, as the design draws it.
 *
 * With nowhere to go yet (`href: null`) it keeps the same look but is not a
 * link: no `href`, nothing to click through to, and "not available yet" for
 * assistive technology — so it can never lead anyone to a 404.
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
  const look = cn('rounded-sm font-medium text-content-link', className);
  const label = <span className="underline underline-offset-4">{action.label}</span>;
  // Inline, not flex: on a narrow card the label wraps, and the arrow has to
  // follow its last word instead of being pinned to the far edge.
  const icon = arrow ? (
    <LuArrowRight aria-hidden="true" className="ml-2 inline-block size-4 align-[-0.15em]" />
  ) : null;

  if (action.href === null) {
    return (
      <span className={look}>
        {label}
        {icon}
        <span className="sr-only"> (not available yet)</span>
      </span>
    );
  }

  return (
    <Link href={action.href} className={cn(look, 'transition-colors hover:text-content-accent')}>
      {label}
      {icon}
    </Link>
  );
}
