'use client';

import { useEffect, useId, useRef } from 'react';
import type { ReactNode, Ref } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

const QUIET_ACTION =
  'inline-flex min-h-6 items-center gap-1 rounded-sm text-xs font-medium hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** A list's title and its "+ Add", as each list in the design opens. */
export function ListHeader({
  title,
  addLabel,
  onAdd,
  addRef,
}: {
  /** Left out where the card around the list already names it. */
  title?: string;
  /** Starts with "Add", so the visible word is part of the name (WCAG 2.5.3). */
  addLabel: string;
  onAdd: () => void;
  addRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        title === undefined ? 'justify-end' : 'justify-between',
      )}
    >
      {title === undefined ? null : (
        <h3 className="text-[0.8125rem] font-semibold text-content">{title}</h3>
      )}
      <button
        ref={addRef}
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className={cn(QUIET_ACTION, 'text-content-link')}
      >
        <LuPlus aria-hidden="true" className="size-3.5" />
        Add
      </button>
    </div>
  );
}

/**
 * One entry in a list: its numbered label, "Remove", and its fields.
 *
 * An entry added by the person takes focus on its first empty field as it
 * appears, so the keyboard lands where typing starts (§6.8).
 */
export function EntryPanel({
  entryKey,
  label,
  removeLabel,
  onRemove,
  focusOnMount,
  children,
}: {
  entryKey: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
  focusOnMount: boolean;
  children: (labelId: string) => ReactNode;
}) {
  const labelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const focusFirst = useRef(focusOnMount);

  useEffect(() => {
    if (!focusFirst.current) return;
    const controls = [
      ...(root.current?.querySelectorAll<HTMLElement & { value: string }>(
        'input, select, textarea',
      ) ?? []),
    ];
    (controls.find((control) => control.value === '') ?? controls[0])?.focus();
  }, []);

  return (
    <div
      ref={root}
      role="group"
      aria-labelledby={labelId}
      data-entry={entryKey}
      className="rounded-lg border border-border-subtle bg-surface-subtle p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="text-xs font-medium tracking-wide text-content-subtle uppercase">
          {label}
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          // Quiet until it is reached for: removing an entry is ordinary work,
          // and a row of orange makes a list of them look like a list of faults.
          className={cn(
            QUIET_ACTION,
            'text-content-subtle hover:text-content-danger focus-visible:text-content-danger',
          )}
        >
          <LuTrash2 aria-hidden="true" className="size-3.5" />
          Remove
        </button>
      </div>
      <div className="mt-3">{children(labelId)}</div>
    </div>
  );
}
