import type { Metadata } from 'next';
import Link from 'next/link';
import { cn } from '@hireevo/ui-web';
import { SettingsHub } from '@/features/account/settings-hub.tsx';
import { CONTAINER } from '@/features/workspace/layout.ts';

export const metadata: Metadata = {
  title: 'Account settings',
  // One person's own settings. Nothing here is for a crawler.
  robots: { index: false, follow: false },
};

/**
 * Account settings: the way into each part of the account.
 *
 * In the `(workspace)` group, so being here is the protection and the header
 * above it comes with the group (§6.6). It used to sit outside, which is why it
 * had no header at all.
 */
export default function AccountSettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main-content" className={cn(CONTAINER, 'pt-10 pb-24')}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-content-accent sm:text-[2rem]">
              Account settings
            </h1>
            <p className="mt-2 text-base text-content-subtle">
              Manage your account, security, and preferences.
            </p>
          </div>

          <Link
            href="/client-profile"
            className="shrink-0 rounded-sm text-sm font-medium text-content-link underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Back to profile
          </Link>
        </div>

        <div className="mt-8">
          <SettingsHub />
        </div>
      </main>
    </div>
  );
}
