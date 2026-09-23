import Link from 'next/link';
import { useId } from 'react';
import { LuArrowRight, LuCheck, LuPlus, LuZap } from 'react-icons/lu';
import { Badge, Button, Card, ProgressRing, buttonVariants, cn } from '@hireevo/ui-web';
import { EYEBROW } from './layout.ts';
import type { ProfileStrength } from './types.ts';

/** The button at the foot of the card, whether it navigates or acts in place. */
const ACTION = 'mt-6 h-11 rounded-lg font-semibold';

/** Directly under the first, so the two read as one pair rather than two rows. */
const SECONDARY_ACTION = 'mt-3 h-11 rounded-lg font-semibold';

export function ProfileStrengthCard({
  strength,
  compact = false,
}: {
  strength: ProfileStrength;
  /**
   * For the narrow column beside the client profile, where the dashboard's
   * proportions leave the headline about a hundred pixels to wrap in. The ring
   * shrinks and the sentence moves under it, which is how the design draws this
   * card at that width.
   */
  compact?: boolean;
}) {
  const headingId = useId();
  const { percent, done, total } = strength;
  const blurb = 'A stronger profile ranks higher and wins more briefs.';

  return (
    <Card aria-labelledby={headingId} className="border-l-4 border-border-accent p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={EYEBROW}>Profile strength</p>
        {strength.label === null ? null : <Badge icon={<LuZap />}>{strength.label}</Badge>}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <ProgressRing
          value={percent}
          label="Profile strength"
          valueText={`${percent} percent complete, ${done} of ${total} steps done`}
          size={compact ? 72 : 92}
          thickness={compact ? 6 : 7}
        >
          <span
            className={cn(
              'leading-none font-bold text-content-accent',
              compact ? 'text-xl' : 'text-2xl',
            )}
          >
            {percent}%
          </span>
          <span className="mt-1 text-xs text-content-subtle">complete</span>
        </ProgressRing>
        <div className="min-w-0">
          <h2
            id={headingId}
            className={cn(
              'leading-snug font-semibold text-balance text-content-accent',
              compact ? 'text-base' : 'text-xl',
            )}
          >
            {strength.headline}
          </h2>
          {compact ? null : (
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-content-subtle">
              {done} of {total} steps done. {blurb}
            </p>
          )}
        </div>
      </div>

      {/* Below the ring rather than beside it: at this width there is no beside. */}
      {compact ? <p className="mt-3 text-sm text-content-subtle">{blurb}</p> : null}

      <ul className="mt-5 flex flex-col gap-3">
        {strength.items.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-[0.9375rem]">
            {item.done ? (
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-content-on-accent"
              >
                <LuCheck className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-content-warning text-content-warning"
              >
                <LuPlus className="size-3" />
              </span>
            )}
            <span
              className={cn(
                'min-w-0 flex-1',
                item.done ? 'text-content-muted' : 'text-content-accent',
              )}
            >
              {item.label}
              <span className="sr-only">{item.done ? ', done' : ', to do'}</span>
            </span>
            {item.done ? null : (
              <span
                aria-hidden="true"
                className="shrink-0 text-xs font-medium tracking-wide text-content-warning uppercase"
              >
                To do
              </span>
            )}
          </li>
        ))}
      </ul>

      {'href' in strength.action ? (
        <Link
          href={strength.action.href}
          className={cn(
            buttonVariants({ variant: 'primary', size: 'md', fullWidth: true }),
            ACTION,
          )}
        >
          {strength.action.label}
          <LuArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <Button
          type="button"
          fullWidth
          onClick={strength.action.onClick}
          disabled={strength.action.disabled ?? false}
          className={ACTION}
        >
          {strength.action.label}
          <LuArrowRight aria-hidden="true" className="size-4" />
        </Button>
      )}

      {/* No arrow on this one, and a quieter variant: it is the same card's
          second choice, not a second way forward. */}
      {strength.secondaryAction === undefined ? null : 'href' in strength.secondaryAction ? (
        <Link
          href={strength.secondaryAction.href}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'md', fullWidth: true }),
            SECONDARY_ACTION,
          )}
        >
          {strength.secondaryAction.label}
        </Link>
      ) : (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={strength.secondaryAction.onClick}
          disabled={strength.secondaryAction.disabled ?? false}
          className={SECONDARY_ACTION}
        >
          {strength.secondaryAction.label}
        </Button>
      )}
    </Card>
  );
}
