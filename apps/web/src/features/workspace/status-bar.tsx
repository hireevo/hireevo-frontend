'use client';

import { useId, useState } from 'react';
import { LuRocket } from 'react-icons/lu';
import { Switch, cn } from '@hireevo/ui-web';
import type { AvailabilityControl } from '@/features/profile-setup/use-availability.ts';
import { ActionLink } from './action-link.tsx';
import { CONTAINER } from './layout.ts';
import type { SellerStatus } from './types.ts';

/**
 * The bar under the header: seller tier, upgrade, whether the profile is live,
 * and availability.
 *
 * Given an `availability` control, the switch is the profile's own — it saves,
 * and it survives a reload. Without one, as on the design preview where nobody
 * is signed in, it moves and changes nothing, which is what a preview is.
 *
 * The tier and the upgrade link are still the design's: nothing on the account
 * carries either yet.
 */
export function StatusBar({
  seller,
  availability,
}: {
  seller: SellerStatus;
  availability?: AvailabilityControl;
}) {
  const labelId = useId();
  const errorId = useId();
  const [shown, setShown] = useState(seller.available);
  const live = availability !== undefined;
  const available = live ? availability.on : shown;

  return (
    // A landmark, not a bare strip: everything on a page has to sit inside one,
    // and this sits between the header and the page's own `main`.
    <section aria-label="Seller status" className="border-b border-border-subtle bg-surface">
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
            <Switch
              checked={available}
              // Disabled until the profile has answered (so the control someone
              // just pressed does not lose their focus mid-save, §6.8) and until
              // it is published — availability means nothing on a profile no one
              // can see, so it cannot be turned on before publishing.
              disabled={live && (!availability.ready || !availability.published)}
              onCheckedChange={(next) => (live ? void availability.set(next) : setShown(next))}
              aria-labelledby={labelId}
              {...(live && availability.error !== null ? { 'aria-describedby': errorId } : {})}
            />
            <span id={labelId}>Available</span>
          </span>
          {live && availability.ready && !availability.published ? (
            <span className="text-xs text-content-subtle">
              Publish your profile to become available
            </span>
          ) : null}
          {live && availability.error !== null ? (
            <span id={errorId} role="alert" className="text-xs text-content-warning">
              {availability.error}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
