'use client';

import Link from 'next/link';
import { buttonVariants, cn } from '@hireevo/ui-web';
import { FeatureCard } from './feature-card.tsx';
import { CONTAINER, EYEBROW } from './layout.ts';
import { ProfileStrengthCard } from './profile-strength-card.tsx';
import type { DashboardData } from './snapshot.ts';
import { StatCard } from './stat-card.tsx';

/** The dashboard's own content. The chrome above it is the layout's; see workspace-chrome.tsx. */
export function WorkspaceDashboard({ data }: { data: DashboardData }) {
  const { editProfile, stats, cards, strength } = data;

  return (
    <div className="flex min-h-dvh flex-col bg-surface-subtle">
      <main id="main-content" className={cn(CONTAINER, 'flex-1 pt-8 pb-16 sm:pt-10')}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className={EYEBROW}>Professional workspace</p>
            <h1 className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight text-balance text-content-accent sm:text-3xl">
              Your market-ready foundation
            </h1>
            <p className="mt-2 text-base text-content-subtle">
              Everything buyers see at a glance — kept current as you grow.
            </p>
          </div>
          <Link
            href={editProfile.href}
            className={cn(
              buttonVariants({ variant: 'primary', size: 'md' }),
              'w-full shrink-0 rounded-lg px-5 text-[0.9375rem] font-semibold sm:w-auto',
            )}
          >
            {editProfile.label}
          </Link>
        </div>

        <ul className="mt-6 grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <li key={stat.id}>
              <StatCard stat={stat} />
            </li>
          ))}
        </ul>

        {/* Profile strength comes first in the markup and is placed in the right
            column from `lg`. On a phone the screen's main call to action then
            sits under the numbers instead of after three long cards, and on a
            desktop it is still read — and tabbed to — before them. */}
        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-3">
          <div className="lg:col-start-3 lg:row-start-1 lg:self-start">
            <ProfileStrengthCard strength={strength} />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
            {cards.map((card) => (
              <FeatureCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
