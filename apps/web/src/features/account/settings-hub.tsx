import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LuArrowUpRight, LuBell, LuContact, LuIdCard, LuShieldCheck } from 'react-icons/lu';
import { cn } from '@hireevo/ui-web';

type Area = {
  title: string;
  description: string;
  icon: ReactNode;
  /**
   * Absent while the screen behind it does not exist yet. Typed as a route, so
   * a card pointing at a page nobody wrote fails the build rather than the
   * click (§6.7).
   */
  href?: Route;
};

/**
 * The four parts of the account, as the design lays them out.
 *
 * Two of them have somewhere to go. Notifications and identity verification
 * have no API behind them — no endpoint, no table — so they are drawn but not
 * linked: a card that opens a page with nothing on it is worse than one that
 * says it is not ready, and a link to a route that does not exist is the sort
 * of thing §6.7 exists to stop.
 */
const AREAS: readonly Area[] = [
  {
    title: 'Personal information',
    description: 'Update your name, email address, online visibility, and account status.',
    icon: <LuContact />,
    href: '/account/personal',
  },
  {
    title: 'Account security',
    description: 'Update your password and manage additional security settings.',
    icon: <LuShieldCheck />,
    href: '/account/security',
  },
  {
    title: 'Notifications',
    description: 'Select the notifications you want — and how you’d like to receive them.',
    icon: <LuBell />,
  },
  {
    title: 'Identity verification',
    description: 'Help keep the marketplace safe and trustworthy by verifying who you are.',
    icon: <LuIdCard />,
  },
];

/** The tile in the card's corner. Smaller than the section cards': this is a list, not a page. */
function Tile({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 items-center justify-center rounded-xl bg-surface-accent-subtle text-content-accent [&>svg]:size-5"
    >
      {children}
    </span>
  );
}

function AreaCard({ area }: { area: Area }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-4">
        <Tile>{area.icon}</Tile>
        {area.href === undefined ? (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-content-subtle">
            Soon
          </span>
        ) : (
          <LuArrowUpRight
            aria-hidden="true"
            className="size-5 shrink-0 text-content-subtle transition-colors group-hover:text-content-accent"
          />
        )}
      </div>

      {/* The heading sits well below the tile, as the frame draws it: the card
          is mostly air, and the copy is the bottom third of it. */}
      <h2 className="mt-14 text-xl font-bold text-content-accent">{area.title}</h2>
      <p className="mt-2 text-sm leading-[1.6] text-content-subtle">{area.description}</p>
    </>
  );

  const shape =
    'flex h-full w-full min-w-0 flex-col rounded-xl border border-border-subtle bg-surface-raised p-6 transition-colors';

  return area.href === undefined ? (
    <div className={shape}>{body}</div>
  ) : (
    <Link
      href={area.href}
      className={cn(
        shape,
        'group hover:border-border hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
      )}
    >
      {body}
    </Link>
  );
}

/**
 * Account settings: what the account holds, and the way into each part of it.
 *
 * A list of destinations rather than a screen that does anything itself, which
 * is why it is a server component — nothing here needs the browser.
 */
export function SettingsHub() {
  return (
    <ul className="grid min-w-0 gap-6 lg:grid-cols-2">
      {AREAS.map((area) => (
        <li key={area.title} className="flex min-w-0">
          <AreaCard area={area} />
        </li>
      ))}
    </ul>
  );
}
