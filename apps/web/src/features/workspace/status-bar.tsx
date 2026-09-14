'use client';

import { useId, useState } from 'react';
import { LuRocket } from 'react-icons/lu';
import { Switch, cn } from '@hireevo/ui-web';
import { ActionLink } from './action-link.tsx';
import { CONTAINER } from './layout.ts';
import type { SellerStatus } from './types.ts';

/**
 * The bar under the header: seller tier, upgrade, whether the profile is live,
 * and availability.
 *
 * Only the design preview renders it. Nothing on the account yet carries a
 * tier or an availability flag, and the publish routes have no documented
 * body, so on the real dashboard a switch here would change nothing — which is
 * exactly the inert control §6.7 forbids.
 */
export function StatusBar({ seller }: { seller: SellerStatus }) {
  const labelId = useId();
  const [available, setAvailable] = useState(seller.available);

  return (
    <div className="border-b border-border-subtle bg-surface">
      <div
        className={cn(
          CONTAINER,
          'flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2',
        )}
      >
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem]">
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-muted text-content-link"
          >
            <LuRocket className="size-4" />
          </span>
          <span className="font-medium text-content-accent">{seller.tier}</span>
          {seller.upgrade === null ? null : (
            <>
              <span aria-hidden="true" className="h-4 w-px bg-border-subtle" />
              <ActionLink action={seller.upgrade} />
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9375rem] text-content-accent">
          {seller.profileLive ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="size-2 rounded-full bg-accent" />
              Profile live
            </span>
          ) : null}
          <span aria-hidden="true" className="h-4 w-px bg-border-subtle" />
          <span className="inline-flex items-center gap-2">
            <Switch checked={available} onCheckedChange={setAvailable} aria-labelledby={labelId} />
            <span id={labelId}>Available</span>
          </span>
        </div>
      </div>
    </div>
  );
}
