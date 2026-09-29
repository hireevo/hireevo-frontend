'use client';

import { useEffect, useRef, useState } from 'react';
import { LuEllipsisVertical } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

export interface RowMenuItem {
  label: string;
  onChoose: () => void;
  /** Draws the entry in the danger colour — for the one that closes an account. */
  danger?: boolean;
}

/**
 * The three dots at the end of a row, and what they open.
 *
 * A menu rather than a row of buttons: the list is what an administrator reads,
 * and one control per row keeps the actions out of the way until they are
 * wanted — which is how the screen this replaces had it.
 *
 * Built by hand rather than borrowed, because the behaviour is the point:
 * `aria-haspopup` and `aria-expanded` so it is announced as a menu that is open
 * or shut, the first entry focused on opening so the keyboard can reach it at
 * all, Escape and a press outside to dismiss, and the focus handed back to the
 * dots either way. A menu that covers the page and cannot be dismissed from the
 * keyboard is a trap (§6.8).
 */
export function RowMenu({
  label,
  items,
  busy = false,
}: {
  label: string;
  items: RowMenuItem[];
  /** While something else is being written, the dots stop taking presses. */
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();

    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    const away = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) === true || trigger.current?.contains(target) === true) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('keydown', dismiss);
    document.addEventListener('mousedown', away);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('mousedown', away);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((shown) => !shown)}
        className="flex size-9 items-center justify-center rounded-lg border border-border-subtle bg-surface text-content-subtle transition-colors hover:bg-surface-subtle hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LuEllipsisVertical aria-hidden="true" className="size-4" />
        <span className="sr-only">Actions for {label}</span>
      </button>

      {open ? (
        <div
          ref={panel}
          role="menu"
          aria-label={`Actions for ${label}`}
          className="absolute top-full right-0 z-10 mt-1 flex w-48 flex-col rounded-lg border border-border-subtle bg-surface py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onChoose();
              }}
              className={cn(
                'flex min-h-9 w-full items-center px-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
                item.danger === true
                  ? 'text-content-danger hover:bg-surface-danger-subtle'
                  : 'text-content hover:bg-surface-subtle',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
