'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';
import { Button } from '@hireevo/ui-web';

/**
 * "Password Changed!", drawn over the reset screen once the new password is set.
 *
 * Every measurement is the file's. The dimming layer is #505050 *multiplied*
 * over the page rather than a translucent black, which is why the blue panel
 * sinks to navy instead of turning grey. The card's 21px half-white stroke is
 * centred on its edge, so half of it is the border and half is a ring outside
 * it — the ring's radius grows by the same half, as Figma's does.
 */
export function PasswordChangedDialog() {
  const router = useRouter();
  const titleId = useId();
  const bodyId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The only thing to do here is the button, so it takes focus: a keyboard
    // or screen-reader user lands on the dialog, not somewhere behind it.
    dialog.current?.querySelector('button')?.focus();

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <>
      {/* Its own fixed layer, outside the dialog's. A blend mode only mixes with
          what is behind it in the same stacking context, and the z-indexed
          wrapper below is one: inside it there is nothing to multiply with, and
          the overlay renders as flat grey instead of dimming the page. */}
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-[#505050] mix-blend-multiply" />

      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-6">
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          className="relative flex min-h-[555px] w-full max-w-[425px] flex-col items-center justify-center gap-[46px] rounded-[12px] border-[10.5px] border-white/50 bg-surface-subtle px-6 shadow-[0_0_0_10.5px_rgb(255_255_255/0.5)]"
        >
          {/* 133px tile: an inside stroke, a faint blue ring, the stepped mark at
            10%, and the gradient tick centred on top. */}
          <div className="relative size-[133px] shrink-0 overflow-hidden rounded-[12px] border-[1.853px] border-[#e6edf4] shadow-[0_0_0_0.926px_rgb(0_122_255/0.15)]">
            <Image
              src="/auth/panel-motif.svg"
              alt=""
              width={417}
              height={367}
              unoptimized
              className="absolute top-[-2.85px] left-[-12.85px] h-[136px] w-[155px] max-w-none -scale-x-100 opacity-10"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-[79px] items-center justify-center rounded-[10.15px] bg-[linear-gradient(90deg,#0575e6,#054384)]">
                <svg
                  width="36.32"
                  height="23.11"
                  viewBox="0 0 36.32 23.11"
                  fill="none"
                  overflow="visible"
                  aria-hidden="true"
                >
                  <path
                    d="M0 9.905 13.207 23.112 36.319 0"
                    stroke="#fff"
                    strokeWidth="6.603"
                    strokeLinecap="round"
                    strokeLinejoin="miter"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex w-[297px] max-w-full flex-col items-center gap-[15.58px] text-center text-[#224461]">
            <h2 id={titleId} className="text-[30.39px] leading-none font-semibold">
              Password Changed!
            </h2>
            <p id={bodyId} className="text-xl leading-[1.05]">
              Your password has been changed successfully.
            </p>
          </div>

          {/* Resetting ended every session, so the account is one sign-in away;
            sign-in lands on the account once it succeeds. */}
          <Button
            type="button"
            size="xl"
            className="w-[265px] max-w-full shrink-0"
            onClick={() => router.push('/sign-in?reset=1')}
          >
            Go to your Account
          </Button>
        </div>
      </div>
    </>
  );
}
