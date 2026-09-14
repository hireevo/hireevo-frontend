'use client';

import Link from 'next/link';
import { useId } from 'react';
import { cn } from '@hireevo/ui-web';
import { hrefFor, type Step } from './steps.ts';

export type PublishState =
  | { kind: 'idle' }
  | { kind: 'publishing' }
  | { kind: 'incomplete'; issues: { message: string; step: Step }[] }
  | { kind: 'failed'; message: string };

/**
 * The publish call to action.
 *
 * Once a profile is published the API applies each autosave to it directly —
 * there is no separate published revision to promote — so the banner stops
 * offering to publish and says what is true instead.
 */
export function PublishBanner({
  published,
  state,
  onPublish,
}: {
  published: boolean;
  state: PublishState;
  onPublish: () => void;
}) {
  const headingId = useId();
  const publishing = state.kind === 'publishing';

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl bg-surface-inverse px-5 py-5 text-content-inverse sm:px-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold">
            {published ? 'Your profile is live.' : 'Ready when you are.'}
          </h2>
          <p className="mt-1 text-sm text-content-inverse-muted">
            {published
              ? 'Changes to a published profile are visible as soon as they save.'
              : 'Publishing never happens through autosave.'}
          </p>
        </div>
        {published ? null : (
          <button
            type="button"
            onClick={() => {
              if (!publishing) onPublish();
            }}
            aria-disabled={publishing || undefined}
            aria-busy={publishing || undefined}
            className={cn(
              'inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-surface px-4 text-sm font-semibold text-content-accent transition-colors hover:bg-surface-subtle',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-content-inverse',
              publishing && 'cursor-wait',
            )}
          >
            {publishing ? 'Publishing…' : 'Publish current revision'}
          </button>
        )}
      </div>

      {state.kind === 'incomplete' ? (
        <div role="alert" className="mt-4 rounded-lg bg-surface p-4 text-sm text-content">
          <p className="font-medium">Before this profile can be published:</p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
            {state.issues.map((issue) => (
              <li key={`${issue.step.id}-${issue.message}`}>
                {issue.message} <span className="text-content-subtle">—</span>{' '}
                <Link
                  href={hrefFor(issue.step.id)}
                  className="rounded-sm font-medium text-content-link underline underline-offset-4"
                >
                  {issue.step.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.kind === 'failed' ? (
        <p role="alert" className="mt-4 rounded-lg bg-surface p-4 text-sm text-content-danger">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
