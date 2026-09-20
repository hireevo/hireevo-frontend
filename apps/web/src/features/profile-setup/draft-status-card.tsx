'use client';

import { useEffect, useState } from 'react';
import { Badge, Card } from '@hireevo/ui-web';
import type { SaveState } from './use-profile-draft.ts';
import { STEPS } from './steps.ts';

/** "just now", "3 minutes ago", or the time of day once it is over an hour. */
export function sinceLabel(at: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - at.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  return `at ${at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

const dot = <span className="block size-1.5 rounded-full bg-current" />;

export function DraftStatusCard({
  save,
  sectionsSaved,
  onRetry,
  onReload,
}: {
  save: SaveState;
  sectionsSaved: number;
  onRetry: () => void;
  onReload: () => void;
}) {
  const now = useNow(30_000);

  const badge = {
    saved: (
      <Badge tone="accent" icon={dot}>
        Autosaved
      </Badge>
    ),
    saving: <Badge icon={dot}>Saving</Badge>,
    unsaved: <Badge icon={dot}>Unsaved</Badge>,
    failed: (
      <Badge tone="warning" icon={dot}>
        Not saved
      </Badge>
    ),
    conflict: (
      <Badge tone="warning" icon={dot}>
        Out of date
      </Badge>
    ),
  }[save.kind];

  return (
    <Card aria-label="Draft status" className="rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-content-link uppercase">Draft</p>
        {badge}
      </div>

      {/* Polite, not assertive: a save finishing is news worth hearing, but not
          worth interrupting someone mid-sentence for. */}
      <div role="status" aria-live="polite" className="mt-2 text-sm text-content-subtle">
        {save.kind === 'saved' &&
          (save.at === null
            ? 'All changes saved'
            : `All changes saved ${sinceLabel(save.at, now)}`)}
        {save.kind === 'saving' && 'Saving your changes…'}
        {save.kind === 'unsaved' && 'Your changes will save in a moment'}
        {save.kind === 'failed' && save.message}
        {save.kind === 'conflict' && save.message}
      </div>
      {save.kind === 'failed' ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex min-h-6 items-center rounded-sm text-sm font-medium text-content-link underline underline-offset-4"
        >
          Try saving again
        </button>
      ) : null}
      {save.kind === 'conflict' ? (
        <button
          type="button"
          onClick={onReload}
          className="mt-2 inline-flex min-h-6 items-center rounded-sm text-sm font-medium text-content-link underline underline-offset-4"
        >
          Load the latest version
        </button>
      ) : null}

      <p className="mt-4 flex items-baseline gap-1.5 border-t border-border-subtle pt-4">
        <span className="text-xl font-semibold text-content">{sectionsSaved}</span>
        <span className="text-sm text-content-subtle">of {STEPS.length} sections saved</span>
      </p>
    </Card>
  );
}
