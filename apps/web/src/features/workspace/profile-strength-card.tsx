import Link from 'next/link';
import { useId } from 'react';
import { LuArrowRight, LuCheck, LuPlus, LuZap } from 'react-icons/lu';
import { Badge, Card, ProgressRing, buttonVariants, cn } from '@hireevo/ui-web';
import { EYEBROW } from './layout.ts';
import type { ProfileStrength } from './types.ts';

export function ProfileStrengthCard({ strength }: { strength: ProfileStrength }) {
  const headingId = useId();
  const { percent, done, total } = strength;

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
          size={92}
          thickness={7}
        >
          <span className="text-2xl leading-none font-bold text-content-accent">{percent}%</span>
          <span className="mt-1 text-xs text-content-subtle">complete</span>
        </ProgressRing>
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-xl leading-snug font-semibold text-balance text-content-accent"
          >
            {strength.headline}
          </h2>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-content-subtle">
            {done} of {total} steps done. A stronger profile ranks higher and wins more briefs.
          </p>
        </div>
      </div>

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

      <Link
        href={strength.action.href}
        className={cn(
          buttonVariants({ variant: 'primary', size: 'md', fullWidth: true }),
          'mt-6 h-11 rounded-lg font-semibold',
        )}
      >
        {strength.action.label}
        <LuArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </Card>
  );
}
