'use client';

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { Badge, cn } from '@hireevo/ui-web';
import type { MenuEntry } from './types.ts';

type Layout = 'bar' | 'panel';

const ROW: Record<Layout, string> = {
  bar: 'flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm',
  panel:
    'flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-base',
};

/**
 * An entry with no screen behind it yet. It is listed so the menu shows what is
 * coming, but it is text rather than a link, so it cannot lead to a 404.
 */
function SoonRow({ label, layout }: { label: string; layout: Layout }) {
  return (
    <span className={cn(ROW[layout], 'text-content-muted')}>
      {label}
      <Badge className="px-2 py-0.5 text-xs">Soon</Badge>
    </span>
  );
}

/** One entry of a header dropdown: a link, a "Soon" row, or the sign-out button. */
export function MenuEntryRow({
  entry,
  layout,
  onSignOut,
  onChoose,
}: {
  entry: MenuEntry;
  layout: Layout;
  /** Null where there is no one to sign out, as on the design preview. */
  onSignOut: (() => void) | null;
  /** Called when the entry is used, so the menu around it can close. */
  onChoose: () => void;
}) {
  if (entry.kind === 'sign-out') {
    if (onSignOut === null) return <SoonRow label={entry.label} layout={layout} />;
    return (
      <button
        type="button"
        onClick={() => {
          onChoose();
          onSignOut();
        }}
        className={cn(
          ROW[layout],
          'text-content-danger transition-colors hover:bg-surface-danger-subtle',
        )}
      >
        {entry.label}
      </button>
    );
  }

  if (entry.href === null) return <SoonRow label={entry.label} layout={layout} />;

  return (
    <Link
      href={entry.href}
      onClick={onChoose}
      className={cn(ROW[layout], 'text-content transition-colors hover:bg-surface-subtle')}
    >
      {entry.label}
    </Link>
  );
}

/**
 * A header item that opens a list of entries under it.
 *
 * A disclosure, not an ARIA `menu`: a handful of links and a button need no
 * arrow-key roving, and a `menu` role that does not implement it is worse than
 * a plain list. It opens on click rather than hover, so it works the same on a
 * touch screen and from the keyboard, and it closes on Escape (focus back on
 * its button), on a click elsewhere, and when focus tabs out of it. Which one is
 * open is held by the header, so opening one closes the others.
 */
export function NavDropdown({
  label,
  entries,
  open,
  onOpenChange,
  onSignOut,
}: {
  label: string;
  entries: MenuEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: (() => void) | null;
}) {
  const panelId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (container.current?.contains(event.target as Node) === true) return;
      onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onOpenChange(false);
      trigger.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={container}
      className="relative flex h-full"
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) onOpenChange(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        {...(open ? { 'aria-controls': panelId } : {})}
        className={cn(
          'inline-flex h-full items-center gap-1 text-[0.9375rem] whitespace-nowrap transition-colors',
          open ? 'text-content-accent' : 'text-content-muted hover:text-content-accent',
        )}
      >
        {label}
        <LuChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 transition-transform duration-fast', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute top-full left-0 z-30 -mt-1 w-60 rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
        >
          <ul className="flex flex-col">
            {entries.map((entry) => (
              <li
                key={entry.label}
                className={
                  entry.kind === 'sign-out' ? 'mt-1 border-t border-border-subtle pt-1' : undefined
                }
              >
                <MenuEntryRow
                  entry={entry}
                  layout="bar"
                  onSignOut={onSignOut}
                  onChoose={() => onOpenChange(false)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
