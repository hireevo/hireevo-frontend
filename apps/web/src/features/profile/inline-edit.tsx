'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { LuPencil } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

export type InlineEditProps = {
  value: string;
  /** Shown in the pencil's place while the value is empty, as in the design. */
  placeholder: string;
  /**
   * The action, e.g. "Edit display name". Used verbatim on the input, and in
   * front of the value on the idle control once there is one to read out.
   */
  label: string;
  onSave: (value: string) => void;
  maxLength?: number;
  /**
   * False until "Complete your profile" turns editing on, which is when every
   * other control on this page appears. Read-only renders the value as the text
   * it is rather than a button that looks pressable and is not — and an empty
   * value renders as nothing at all, because "Add display name" on a page with
   * no way to add one is an instruction that cannot be followed.
   */
  editable?: boolean;
  /** Applied to both states, so the text does not resize when editing starts. */
  className?: string;
};

/**
 * Text that becomes an input where it sits.
 *
 * The idle state is a button rather than text with a pencil beside it: the
 * pencil is 14px, and a target that small is hard to hit with a mouse and
 * impossible with a thumb. The whole line is the target instead.
 *
 * Enter and blur commit, Escape abandons. Escape has to win over the blur it
 * causes, hence the ref — committing a value the user just cancelled is the
 * kind of bug that only shows up on real text someone cared about.
 */
export function InlineEdit({
  value,
  placeholder,
  label,
  onSave,
  maxLength = 80,
  editable = true,
  className,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) return;
    // Focus, then select. `select()` alone leaves the caret nowhere: the field
    // looks ready and swallows the first thing typed, and Enter and Escape go
    // to the document instead of to the input.
    input.current?.focus();
    input.current?.select();
  }, [editing]);

  function start() {
    setDraft(value);
    cancelled.current = false;
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    if (cancelled.current) return;
    const next = draft.trim();
    if (next !== value) onSave(next);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'Escape') {
      cancelled.current = true;
      event.currentTarget.blur();
    }
  }

  if (!editable) {
    return value === '' ? null : (
      <span className={cn('inline-block max-w-full truncate px-2 py-0.5', className)}>{value}</span>
    );
  }

  if (editing) {
    return (
      <input
        ref={input}
        value={draft}
        aria-label={label}
        maxLength={maxLength}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        className={cn(
          'w-full min-w-0 rounded-md border border-border-accent bg-surface px-2 py-0.5 outline-none',
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      // While it is empty the visible placeholder *is* the label, so it is the
      // accessible name too — someone driving the page by voice says what they
      // can see. Once there is a value, the name has to say what pressing it
      // does, because "Ayesha Khan, button" describes nothing.
      aria-label={value === '' ? placeholder : `${label}: ${value}`}
      className={cn(
        'group inline-flex max-w-full items-center gap-2 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-surface-subtle',
        value === '' && 'text-content-subtle',
        className,
      )}
    >
      <span className="truncate">{value === '' ? placeholder : value}</span>
      <LuPencil
        aria-hidden="true"
        className="size-3.5 shrink-0 text-content-subtle transition-colors group-hover:text-content-accent"
      />
    </button>
  );
}
