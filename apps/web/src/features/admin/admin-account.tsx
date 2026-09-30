'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { LuChevronDown } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { useSession } from '@/features/auth/session.tsx';
import { displayNameOf, initialsOf } from '@/features/workspace/snapshot.ts';

/**
 * Who is signed in, across the top of the console, and the way back out.
 *
 * The console is a signed-in screen like any other, so it ends the same way the
 * workspace does: the initials in the corner open a small disclosure holding the
 * account page and Sign out. A disclosure rather than an ARIA `menu`, for the
 * reason `UserMenu` gives — two entries do not need arrow-key roving, and a
 * `menu` that does not implement it is worse than a link and a button.
 *
 * Presentational, and given what to draw: `/design-system/admin` renders it with
 * no session, and a component that read one could not be swept.
 */
export function AdminIdentity({
  name,
  role,
  email,
  onSignOut,
}: {
  name: string;
  role: string;
  /** Shown above the entries, so two accounts on one machine are told apart. */
  email: string | null;
  /** Null draws the name alone, for a preview with nobody to sign out. */
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

  // The name, the role under it, and the initials — the same block either way,
  // so the console does not change shape depending on whether it can sign you
  // out. Hidden from the label because the button carries its own.
  const who = (
    <>
      <span aria-hidden="true" className="hidden min-w-0 text-right sm:block">
        <span className="block truncate text-sm font-semibold text-content-accent">{name}</span>
        <span className="block truncate text-xs text-content-subtle">{role}</span>
      </span>
      {/* Initials rather than a photograph: nothing uploads one yet, and a grey
          circle that never becomes a face is a promise the product has not made. */}
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-accent-subtle text-sm font-semibold text-content-link"
      >
        {initialsOf(name)}
      </span>
    </>
  );

  if (onSignOut === null) {
    return (
      <span role="img" aria-label={`${name}, ${role}`} className="flex min-w-0 items-center gap-3">
        {who}
      </span>
    );
  }

  return (
    <div className="relative min-w-0">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        {...(open ? { 'aria-controls': panelId } : {})}
        className={cn(
          'flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-1 py-1 transition-colors',
          'hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
          'sm:gap-3 sm:px-2',
        )}
      >
        {who}
        <LuChevronDown
          aria-hidden="true"
          className={cn(
            'size-4 shrink-0 text-content-subtle transition-transform',
            open && 'rotate-180',
          )}
        />
        <span className="sr-only">Account menu for {name}</span>
      </button>

      {open ? (
        <div
          ref={panel}
          id={panelId}
          className="absolute top-full right-0 z-30 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
        >
          <p className="truncate px-3 py-2 text-sm text-content-subtle">{email ?? name}</p>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-md px-3 text-sm text-content hover:bg-surface-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            Account settings
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-content-danger hover:bg-surface-danger-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The same block, for whoever is actually signed in.
 *
 * The console used to name one person in its source. That is a header that says
 * the wrong thing to every other administrator, and it left the one screen in
 * the app with no way out of it — signing out meant clearing the cookie by hand.
 */
export function AdminAccount() {
  const router = useRouter();
  const { user, signOut } = useSession();

  // The group's guard renders nothing below it until the session is
  // authenticated, so a missing user here is a transition, not a state to draw.
  if (user === null) return null;

  return (
    <AdminIdentity
      name={displayNameOf(user)}
      role={roleLabel(user.roles)}
      email={user.email}
      onSignOut={() => void signOut().then(() => router.replace('/sign-in'))}
    />
  );
}

/**
 * What to call the account under its name.
 *
 * The console is opened on a permission rather than on a role name, so the role
 * here is a label and nothing more — another role granted `admin.user.read`
 * tomorrow gets its own name rather than being called an administrator.
 */
export function roleLabel(roles: readonly string[]): string {
  const first = roles[0];
  if (first === undefined || first === 'admin') return 'Administrator';
  return first.charAt(0).toUpperCase() + first.slice(1);
}
