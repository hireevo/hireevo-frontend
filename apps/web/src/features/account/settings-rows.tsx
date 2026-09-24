'use client';

import { useId } from 'react';
import { LuUser } from 'react-icons/lu';
import { Card, cn } from '@hireevo/ui-web';

/**
 * One line of a settings card: a label, what it currently says, and the way to
 * change it.
 *
 * Shared by both settings screens because the design draws them identically,
 * and two hand-written copies of a row is how the two screens start disagreeing
 * about their own spacing (§8.4).
 */
export function SettingRow({
  label,
  value,
  action,
  children,
}: {
  label: string;
  value?: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-b border-border-subtle py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-semibold text-content-accent">{label}</p>
          {value === undefined ? null : (
            <p className="mt-1 text-sm break-all text-content-muted">{value}</p>
          )}
        </div>
        <div className="shrink-0 pt-1">{action}</div>
      </div>
      {children}
    </div>
  );
}

/**
 * The Edit a row offers when something can actually be changed.
 *
 * `min-h-6` and the padding are the target, not the look: the design draws
 * these as plain text, and a 20px-tall target is under the 24px WCAG 2.5.8 asks
 * for — which the resolution sweep caught at 320px.
 */
export function RowAction({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      // Focused before it opens anything, because Safari does not focus a
      // button when it is clicked. The box that opens remembers what was
      // focused so it can hand focus back on close, and without this that is
      // the document body — which drops a Safari user at the top of the page
      // every time they close a box (§6.8).
      onClick={(event) => {
        event.currentTarget.focus();
        onClick();
      }}
      className={cn(
        'inline-flex min-h-6 items-center rounded-sm px-1 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        tone === 'danger' ? 'text-content-danger' : 'text-content-link',
      )}
    >
      {label}
    </button>
  );
}

/**
 * The same Edit, for a row whose change has no endpoint behind it yet.
 *
 * Drawn because the design draws the row, and refused because a control that
 * opens a form which cannot save is worse than one that says so (§6.7). The
 * reason is announced rather than left as a mystery disabled control.
 */
export function NotYet({
  label,
  reason,
  tone,
}: {
  label: string;
  reason: string;
  tone?: 'danger';
}) {
  const reasonId = useId();
  return (
    <>
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={reasonId}
        className={cn(
          'inline-flex min-h-6 cursor-not-allowed items-center rounded-sm px-1 text-sm font-medium opacity-60',
          tone === 'danger' ? 'text-content-danger' : 'text-content-link',
        )}
      >
        {label}
      </button>
      <span id={reasonId} className="sr-only">
        {reason}
      </span>
    </>
  );
}

/**
 * The note the design puts beside both settings screens.
 *
 * One copy, for the reason the row above has one: the same words drawn twice
 * become two different sets of words the first time either is edited.
 */
export function UsernameHelpCard({ children }: { children?: React.ReactNode }) {
  return (
    <Card aria-labelledby="help-heading" className="flex min-w-0 flex-col p-6 sm:p-7">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-surface-accent-subtle text-content-accent"
      >
        <LuUser className="size-5" />
      </span>

      <h2 id="help-heading" className="mt-6 text-lg font-bold text-content-accent">
        Where can I find my username and display name?
      </h2>
      <p className="mt-2 text-sm leading-[1.6] text-content-muted">
        You can find both your username and display name on your profile. While you can update your
        display name, your username cannot be changed.
      </p>

      {children}
    </Card>
  );
}
