'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LuBell, LuChevronDown, LuCircleHelp, LuMail, LuMenu, LuMoon, LuX } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { CONTAINER } from './layout.ts';
import type { NavItem } from './types.ts';
import { UserMenu } from './user-menu.tsx';

const UTILITIES = [
  { label: 'Notifications', Icon: LuBell, dot: true },
  { label: 'Messages', Icon: LuMail, dot: false },
  { label: 'Help', Icon: LuCircleHelp, dot: false },
  { label: 'Switch theme', Icon: LuMoon, dot: false },
] as const;

/**
 * The design draws these four, but none has anywhere to go: there are no
 * notification, message or help screens, and the app is light-only until a dark
 * design exists. So they appear only on the design preview, marked unavailable.
 */
function UtilityButton({ utility }: { utility: (typeof UTILITIES)[number] }) {
  const { Icon } = utility;
  return (
    <button
      type="button"
      aria-disabled="true"
      className="relative flex size-10 cursor-not-allowed items-center justify-center rounded-md text-content-muted"
    >
      <Icon aria-hidden="true" className="size-5" />
      {utility.dot ? (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2.5 size-1.5 rounded-full bg-content-success"
        />
      ) : null}
      <span className="sr-only">{utility.label} (not available yet)</span>
    </button>
  );
}

function NavEntry({ item, layout }: { item: NavItem; layout: 'bar' | 'panel' }) {
  const shape =
    layout === 'bar'
      ? 'relative inline-flex h-full items-center gap-1 text-[0.9375rem] whitespace-nowrap'
      : 'flex min-h-11 items-center justify-between gap-2 rounded-md px-3 text-base';
  const chevron =
    item.menu === true ? <LuChevronDown aria-hidden="true" className="size-4 shrink-0" /> : null;

  if (item.href === null) {
    return (
      <span className={cn(shape, 'cursor-not-allowed text-content-subtle')}>
        {item.label}
        {chevron}
        <span className="sr-only"> (not available yet)</span>
      </span>
    );
  }

  const current = item.current === true;
  return (
    <Link
      href={item.href}
      {...(current ? { 'aria-current': 'page' as const } : {})}
      className={cn(
        shape,
        'transition-colors',
        current ? 'font-medium text-content-link' : 'text-content-muted hover:text-content-accent',
        layout === 'bar' &&
          current &&
          'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent',
        layout === 'panel' && (current ? 'bg-surface-accent-subtle' : 'hover:bg-surface-subtle'),
      )}
    >
      {item.label}
      {chevron}
    </Link>
  );
}

export function WorkspaceHeader({
  nav,
  utilities,
  user,
  onSignOut,
}: {
  nav: NavItem[];
  utilities: boolean;
  user: { name: string; initials: string };
  onSignOut: (() => void) | null;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const home = nav.find((item) => item.current === true)?.href ?? '/dashboard';

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="border-b border-border-subtle bg-surface">
      <div className={cn(CONTAINER, 'flex h-16 items-center gap-2')}>
        <Link href={home} className="flex shrink-0 items-center rounded-sm">
          <Image
            src="/brand/hireevo-logo.svg"
            alt="HireEvo"
            width={84}
            height={20}
            priority
            unoptimized
          />
        </Link>

        {/* From `lg` the links sit in the bar; below it they would collide
            with the icons, so they move into the menu the button opens. */}
        <nav aria-label="Workspace" className="ml-6 hidden h-full lg:block">
          <ul className="flex h-full items-stretch gap-6">
            {nav.map((item) => (
              <li key={item.label} className="flex">
                <NavEntry item={item} layout="bar" />
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {utilities ? (
            <>
              <ul className="hidden items-center gap-1 lg:flex">
                {UTILITIES.map((utility) => (
                  <li key={utility.label}>
                    <UtilityButton utility={utility} />
                  </li>
                ))}
              </ul>
              <span aria-hidden="true" className="mx-2 hidden h-6 w-px bg-border-subtle lg:block" />
            </>
          ) : null}
          <UserMenu name={user.name} initials={user.initials} onSignOut={onSignOut} />
          <button
            ref={toggle}
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            {...(open ? { 'aria-controls': 'workspace-menu' } : {})}
            className="ml-1 flex size-10 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-subtle lg:hidden"
          >
            {open ? (
              <LuX aria-hidden="true" className="size-5" />
            ) : (
              <LuMenu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {open ? (
        <div id="workspace-menu" className="border-t border-border-subtle lg:hidden">
          <nav aria-label="Workspace" className={cn(CONTAINER, 'py-2')}>
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.label}>
                  <NavEntry item={item} layout="panel" />
                </li>
              ))}
            </ul>
            {utilities ? (
              <ul className="mt-2 flex flex-wrap gap-1 border-t border-border-subtle pt-2">
                {UTILITIES.map((utility) => (
                  <li key={utility.label}>
                    <UtilityButton utility={utility} />
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
