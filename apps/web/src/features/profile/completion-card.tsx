import { Card } from '@hireevo/ui-web';
import type { Completion } from './draft.ts';

/**
 * How complete the profile is, beside the person's details as the design draws
 * it: the figure on a bubble above the bar, the bar's ends labelled, and a line
 * saying what it means.
 *
 * The bubble is placed along the bar at the figure it shows, and kept clear of
 * either end so it is never half outside the card. What a screen reader is told
 * carries the count as well as the percentage — the design shows the count
 * nowhere, and "20 percent" alone does not say how much is left to do.
 */
export function CompletionCard({ completion }: { completion: Completion }) {
  const { done, total, percent } = completion;
  const complete = done === total;

  return (
    <Card className="flex flex-col justify-center gap-4 bg-surface-accent-subtle px-6 py-6">
      <div>
        <div className="relative h-7">
          <span
            style={{ left: `${Math.min(88, Math.max(12, percent))}%` }}
            className="absolute -translate-x-1/2 rounded-md bg-surface-inverse px-2 py-1 text-xs font-semibold text-content-inverse"
          >
            {percent}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-content-subtle">0%</span>
          <div
            role="progressbar"
            aria-label="Profile completion"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={`${percent} percent complete, ${done} of ${total} key steps`}
            className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface"
          >
            <span
              style={{ width: `${percent}%` }}
              className="block h-full rounded-full bg-accent transition-[width] duration-slow"
            />
          </div>
          <span className="text-xs text-content-subtle">100%</span>
        </div>
      </div>

      <p className="text-sm leading-[1.6] text-content-muted">
        {complete
          ? 'Every key step is done. Buyers see a complete profile.'
          : 'You’re nearly there, add a few more details to complete your profile.'}
      </p>
    </Card>
  );
}
