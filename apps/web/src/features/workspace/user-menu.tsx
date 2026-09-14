'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

const AVATAR =
  'flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-content-on-accent';

/**
 * The initials in the corner, and the two things behind them: the account page
 * and signing out. A disclosure rather than an ARIA `menu` — two items do not
 * need arrow-key roving, and a `menu` that does not implement it is worse than
 * a plain list of a link and a button.
 */
export function UserMenu({
  name,
  initials,
  onSignOut,
}: {
  name: string;
  initials: string;
  /** Null renders the initials alone, for the design preview where there is no one to sign out. */
  onSignOut: (() => void) | null;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) === true || button.current?.contains(target) === true) {
        return;
      }
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      // Back where it was: closing with Escape must not drop focus to the page.
      button.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (onSignOut === null) {
    return (
      <span role="img" aria-label={name} className={AVATAR}>
        <span aria-hidden="true">{initials}</span>
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        {...(open ? { 'aria-controls': panelId } : {})}
        className={`${AVATAR} transition-colors hover:bg-accent-hover`}
      >
        <span aria-hidden="true">{initials}</span>
        <span className="sr-only">Account menu for {name}</span>
      </button>

      {open ? (
        <div
          ref={panel}
          id={panelId}
          className="absolute top-full right-0 z-20 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm text-content-subtle">{name}</p>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex min-h-10 items-center rounded-md px-3 text-sm text-content hover:bg-surface-subtle"
          >
            Account
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm text-content-danger hover:bg-surface-danger-subtle"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
