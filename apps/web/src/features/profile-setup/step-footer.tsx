'use client';

import { useId } from 'react';
import { LuArrowRight, LuCheck, LuLock } from 'react-icons/lu';
import { Button, buttonVariants, cn } from '@hireevo/ui-web';

const SHAPE = 'h-10 w-full rounded-lg px-4 text-sm font-semibold sm:w-auto';

/** After a refused Save and next, once its errors have rendered, go to the first. */
export function focusFirstProblem(root: HTMLElement | null) {
  setTimeout(() => {
    root?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, 0);
}

/**
 * The end of a section: whether every field is filled, and the way on.
 *
 * In profile setup, an unfinished section shows the button locked, as the design
 * draws it. It stays in the tab order and says why it does nothing —
 * `aria-disabled` with the reason as its description — where `disabled` would
 * silently skip it. Nothing is trapped behind it: every section is on the page.
 *
 * Where a section is one card of its own rather than a step in a run of six —
 * About on the client profile — `lockWhenIncomplete` is off: the rest of the
 * fields belong to other cards there, so there is nothing to wait for.
 */
export function StepFooter({
  complete,
  onContinue,
  label = 'Save and next',
  arrow = true,
  loading = false,
  lockWhenIncomplete = true,
}: {
  complete: boolean;
  onContinue: () => void;
  label?: string;
  arrow?: boolean;
  loading?: boolean;
  lockWhenIncomplete?: boolean;
}) {
  const reasonId = useId();
  const icon = arrow ? <LuArrowRight aria-hidden="true" className="size-4" /> : null;

  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
      {complete ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-content-subtle">
          <LuCheck aria-hidden="true" className="size-3.5 text-content-success" />
          All fields complete
        </p>
      ) : lockWhenIncomplete ? (
        <p id={reasonId} className="inline-flex items-center gap-1.5 text-xs text-content-subtle">
          <LuLock aria-hidden="true" className="size-3.5" />
          Complete every field to continue
        </p>
      ) : (
        <p className="text-xs text-content-subtle">You can add the rest later</p>
      )}
      {complete || !lockWhenIncomplete ? (
        <Button
          type="button"
          onClick={onContinue}
          loading={loading}
          loadingLabel="Saving"
          className={SHAPE}
        >
          {label}
          {icon}
        </Button>
      ) : (
        <button
          type="button"
          aria-disabled="true"
          aria-describedby={reasonId}
          className={cn(
            buttonVariants(),
            SHAPE,
            'cursor-not-allowed bg-surface-muted text-content-muted hover:bg-surface-muted active:bg-surface-muted',
          )}
        >
          {label}
          {icon}
        </button>
      )}
    </div>
  );
}
