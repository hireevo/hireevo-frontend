'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LuMenu, LuX } from 'react-icons/lu';
import { Badge, cn } from '@hireevo/ui-web';
import { ADMIN_SECTIONS } from './sections.ts';
import type { AdminSection } from './types.ts';

const ROW = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm';

/**
 * One entry of the sidebar.
 *
 * A section with a screen is a link; everything else is a quiet row with a
 * "Soon" badge beside it. Quiet by colour rather than by fading: a faded label
 * drops under the contrast floor, and a row nobody can press still has to be
 * legible to everybody — the same lesson the workspace menu carries.
 *
 * It is a `span`, so it is not in the tab order and not announced as something
 * to press. Listing it says what the admin area will hold; making it pressable
 * would lead into a page that does not exist (§6.7).
 */
function SectionRow({ section, current }: { section: AdminSection; current: boolean }) {
  const icon = <section.icon aria-hidden="true" className="size-4 shrink-0" />;

  if (section.href === undefined) {
    return (
      <span className={cn(ROW, 'text-content-subtle')}>
        {icon}
        <span className="min-w-0 flex-1 truncate">{section.label}</span>
        <Badge className="shrink-0 px-2 py-0.5 text-xs">Soon</Badge>
      </span>
    );
  }

  return (
    <Link
      href={section.href}
      aria-current={current ? 'page' : undefined}
      className={cn(
        ROW,
        'font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus',
        current
          ? 'bg-surface-accent-subtle text-content-link'
          : 'text-content hover:bg-surface-subtle',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
    </Link>
  );
}

/** The grouped list, shared by the sidebar and the menu a narrow window gets. */
function SectionList({ current }: { current: string }) {
  return (
    <div className="flex flex-col gap-6">
      {ADMIN_SECTIONS.map((group) => (
        <nav key={group.title} aria-label={group.title} className="flex flex-col gap-1">
          <h2 className="px-3 pb-1 text-xs font-semibold tracking-wide text-content-subtle uppercase">
            {group.title}
          </h2>
          {group.sections.map((section) => (
            <SectionRow
              key={`${group.title}-${section.label}`}
              section={section}
              current={section.href === current}
            />
          ))}
        </nav>
      ))}
    </div>
  );
}

/**
 * The admin area's frame: the sections down the side, and who is signed in
 * across the top.
 *
 * Below `lg` the sidebar folds into a disclosure rather than staying as a
 * column: seventeen entries beside a table is most of a phone's width spent on
 * navigation. The disclosure closes on Escape and returns focus, because a menu
 * that covers the page and cannot be dismissed from the keyboard is a trap.
 */
export function AdminShell({
  title,
  description,
  current,
  account,
  children,
}: {
  title: string;
  description: string;
  current: string;
  /**
   * Who is signed in, and the way out — `AdminAccount` on the real console and
   * a fixture on the preview. Passed in rather than read here, so this shell
   * stays renderable with no session for the sweep.
   */
  account: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  // Listened for on the document rather than on the panel: pressing the toggle
  // leaves the focus on the toggle, which is outside the panel, so a handler
  // bound to the panel would never hear the key that is supposed to dismiss it.
  useEffect(() => {
    if (!open) return;

    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };

    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);

  return (
    <div className="min-h-dvh bg-surface-subtle">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-surface">
        {/* The console takes the window it is given. A centred column caps a
            table at a fraction of a wide monitor and spends the rest on
            margin, and the whole point of this screen is how many rows fit on
            it. The gutter grows with the window instead. */}
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            ref={toggle}
            type="button"
            onClick={() => setOpen((shown) => !shown)}
            aria-expanded={open}
            aria-controls="admin-sections"
            className="flex size-10 items-center justify-center rounded-lg border border-border-subtle text-content transition-colors hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:hidden"
          >
            {open ? (
              <LuX aria-hidden="true" className="size-5" />
            ) : (
              <LuMenu aria-hidden="true" className="size-5" />
            )}
            <span className="sr-only">{open ? 'Close sections' : 'Open sections'}</span>
          </button>

          <Link
            href="/admin/workers"
            className="rounded-sm text-lg font-bold tracking-tight text-content-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            HireEvo <span className="text-content-subtle">Admin</span>
          </Link>

          <div className="ml-auto min-w-0">{account}</div>
        </div>
      </header>

      <div className="flex w-full gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside
          aria-label="Admin sections"
          className="sticky top-[4.5rem] hidden h-fit w-64 shrink-0 rounded-2xl border border-border-subtle bg-surface p-3 lg:block"
        >
          <SectionList current={current} />
        </aside>

        <main id="main-content" className="min-w-0 flex-1">
          {open ? (
            <div
              id="admin-sections"
              className="mb-5 rounded-2xl border border-border-subtle bg-surface p-3 lg:hidden"
            >
              <SectionList current={current} />
            </div>
          ) : null}

          <div className="mb-5">
            <h1 className="text-2xl font-bold tracking-tight text-balance text-content-accent">
              {title}
            </h1>
            <p className="mt-1 text-sm text-content-muted">{description}</p>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
