'use client';

import { useEffect, useId, useRef } from 'react';
import { LuX } from 'react-icons/lu';
import { cn } from './cn.ts';

/**
 * A modal box, with the parts nobody rewrites correctly the second time.
 *
 * One dialog for the whole app rather than one per caller: focus moving into
 * the box and being kept there, Escape and the backdrop both closing it, the
 * page behind it not scrolling, and focus returning to the control that opened
 * it (§6.8). A caller supplies a title and its contents; everything else is
 * here. It lives in the design system because the third copy of this logic is
 * the one that quietly gets a detail wrong (§8.4).
 */
export function Dialog({
  title,
  description,
  size = 'form',
  onClose,
  children,
}: {
  title: string;
  description?: string;
  /**
   * How wide the box may grow. `form` is the width a few fields read well at;
   * `wide` is for content that is the point of the box rather than a control —
   * a document or a photograph, which a 460px column would shrink to nothing.
   */
  size?: 'form' | 'wide';
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = dialog.current;
    const focusable = () =>
      node === null
        ? []
        : Array.from(
            node.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          );

    // Where focus was before the box opened, so it can be put back. Losing it to
    // the top of the document is how a keyboard user ends up re-tabbing the
    // whole page to get back to the row they were on.
    const opener = document.activeElement;

    // The first *field*, not the close button: the person opened this to type.
    const items = focusable();
    (items.find((item) => item instanceof HTMLInputElement) ?? items[0])?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // `aria-modal` promises a trap; it does not build one. Tab stays inside, and
    // Escape leaves the same way the close button does.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || node === null) return;
      const current = focusable();
      if (current.length === 0) return;
      const first = current[0]!;
      const last = current[current.length - 1]!;
      const active = document.activeElement;
      if (!node.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [onClose]);

  return (
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-content/40" />

      {/* Centring sits on an inner box at least as tall as the screen rather
          than on the scroller: a flex-centred child taller than its scrolling
          parent overflows upwards, where scrolling cannot reach it, and on a
          short window the top of the box would simply be gone. */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            {...(description === undefined ? {} : { 'aria-describedby': descriptionId })}
            className={cn(
              'relative flex w-full min-w-0 flex-col rounded-xl border border-border-subtle bg-surface p-6 shadow-lg sm:p-7',
              size === 'wide' ? 'max-w-[900px]' : 'max-w-[460px]',
            )}
          >
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-bold text-content-accent">
                  {title}
                </h2>
                {description === undefined ? null : (
                  <p id={descriptionId} className="mt-1 text-sm text-content-muted">
                    {description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-content-subtle hover:bg-surface-subtle hover:text-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LuX aria-hidden="true" className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="mt-5 min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
