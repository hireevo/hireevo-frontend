'use client';

import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LuBell, LuCircleHelp, LuMail, LuMenu, LuMoon, LuX } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';
import { CONTAINER } from './layout.ts';
import { MenuEntryRow, NavDropdown } from './nav-menu.tsx';
import type { NavItem } from './types.ts';
import { UserMenu } from './user-menu.tsx';

const UTILITIES = [
  { label: 'Notifications', Icon: LuBell, dot: true },
  { label: 'Messages', Icon: LuMail, dot: false },
  { label: 'Help', Icon: LuCircleHelp, dot: false },
  { label: 'Switch theme', Icon: LuMoon, dot: false },
] as const;

/**
 * Drawn as the design draws them, but nothing is behind any of the four yet —
 * no notification, message or help screens, and the app is light-only until a
 * dark design exists — so they are marked unavailable and do nothing.
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

function NavLink({
  item,
  layout,
}: {
  item: Extract<NavItem, { kind: 'link' }>;
  layout: 'bar' | 'panel';
}) {
  const current = item.current === true;
  const shape = cn(
    layout === 'bar'
      ? 'relative inline-flex h-full items-center text-[0.9375rem] whitespace-nowrap'
      : 'flex min-h-11 items-center rounded-md px-3 text-base',
    'transition-colors',
    current ? 'font-medium text-content-link' : 'text-content-muted hover:text-content-accent',
    layout === 'bar' &&
      current &&
      'after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent',
    layout === 'panel' && (current ? 'bg-surface-accent-subtle' : 'hover:bg-surface-subtle'),
  );

  // A heading rather than a link where there is nowhere to go. Rendering it as
  // a link to the page it is already on gives a control that appears to do
  // nothing, which reads as broken rather than as "you are here".
  if (item.href === null) {
    return (
      <span {...(current ? { 'aria-current': 'page' as const } : {})} className={shape}>
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      {...(current ? { 'aria-current': 'page' as const } : {})}
      className={shape}
    >
      {item.label}
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const current = nav.find((item) => item.kind === 'link' && item.current === true);
  const home: Route = (current?.kind === 'link' ? current.href : null) ?? '/dashboard';

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPanelOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelOpen]);

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

        {/* From `lg` the items sit in the bar, the dropdowns opening under
            them; below it they would collide with the icons, so they move into
            the menu the button opens. */}
        <nav aria-label="Workspace" className="ml-6 hidden h-full lg:block">
          <ul className="flex h-full items-stretch gap-6">
            {nav.map((item) => (
              <li key={item.label} className="flex">
                {item.kind === 'link' ? (
                  <NavLink item={item} layout="bar" />
                ) : (
                  <NavDropdown
                    label={item.label}
                    entries={item.entries}
                    open={openMenu === item.label}
                    onOpenChange={(next) => setOpenMenu(next ? item.label : null)}
                    onSignOut={onSignOut}
                  />
                )}
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
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            {...(panelOpen ? { 'aria-controls': 'workspace-menu' } : {})}
            className="ml-1 flex size-10 items-center justify-center rounded-md text-content-muted transition-colors hover:bg-surface-subtle lg:hidden"
          >
            {panelOpen ? (
              <LuX aria-hidden="true" className="size-5" />
            ) : (
              <LuMenu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">{panelOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      {panelOpen ? (
        <div id="workspace-menu" className="border-t border-border-subtle lg:hidden">
          <nav aria-label="Workspace" className={cn(CONTAINER, 'py-2')}>
            {/* On a phone there is room to list each dropdown's entries under
                its name, so nothing here needs a second tap to reach. */}
            <ul className="flex flex-col gap-1">
              {nav.map((item) => {
                if (item.kind === 'link') {
                  return (
                    <li key={item.label}>
                      <NavLink item={item} layout="panel" />
                    </li>
                  );
                }
                const groupId = `workspace-menu-${item.label.toLowerCase()}`;
                return (
                  <li key={item.label} className="pt-2">
                    <p
                      id={groupId}
                      className="px-3 pb-1 text-xs font-medium tracking-wide text-content-subtle uppercase"
                    >
                      {item.label}
                    </p>
                    <ul aria-labelledby={groupId} className="flex flex-col">
                      {item.entries.map((entry) => (
                        <li key={entry.label}>
                          <MenuEntryRow
                            entry={entry}
                            layout="panel"
                            onSignOut={onSignOut}
                            onChoose={() => setPanelOpen(false)}
                          />
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
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
