'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuTriangleAlert, LuX } from 'react-icons/lu';
import { Button, cn } from '@hireevo/ui-web';

/** How long the "Link copied" note stays before the button offers to copy again. */
const COPIED_FOR = 2500;

/**
 * The profile's public address, shown so it can be read, selected and copied.
 *
 * Share used to copy straight to the clipboard and say "Link copied" in small
 * print, which asks somebody to trust that something they never saw is now on
 * their clipboard — and says nothing useful when the browser refuses, which it
 * does whenever the page is not trusted with it. The address is on screen here
 * instead: the copy button is the quick path, and the text is the fallback that
 * always works, because it can be selected by hand.
 *
 * A modal dialog rather than a popover: it is short-lived, it has one job, and
 * `aria-modal` with a real focus trap is the arrangement a keyboard or screen
 * reader user can get into and out of predictably (§6.8).
 */
export function ShareDialog({
  url,
  live,
  onClose,
}: {
  url: string;
  /**
   * Whether the profile is published, which is what decides whether the link
   * leads anywhere: the public route answers 404 until then, so a link handed
   * to somebody before that is a link they cannot open.
   */
  live: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const linkId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const node = dialog.current;
    const focusable = () =>
      node === null
        ? []
        : Array.from(
            node.querySelectorAll<HTMLElement>(
              'button, [href], input, [tabindex]:not([tabindex="-1"])',
            ),
          );

    // The address itself takes focus, selected: the first thing somebody wants
    // here is the link, and a keyboard user has it in hand without a journey.
    const input = node?.querySelector('input');
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    } else {
      focusable()[0]?.focus();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // `aria-modal` promises a trap; it does not build one. Tab stays inside and
    // Escape leaves, so the dialog cannot be tabbed behind or left with no way
    // out but the mouse.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || node === null) return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
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
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // The note is temporary: left up, it would still say "copied" long after the
  // clipboard had moved on to something else.
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), COPIED_FOR);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
    } catch {
      // Denied, or no clipboard at all — a plain http origin has none. The
      // address is on screen and selected, so there is still a way to take it.
      setFailed(true);
      setCopied(false);
      const input = dialog.current?.querySelector('input');
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-content-accent/40"
      />

      {/* Centring on an inner box at least as tall as the screen, not on the
          scroller: a flex-centred child taller than its scrolling parent
          overflows upwards, where scrolling cannot reach it. */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative flex w-full max-w-[480px] flex-col gap-4 rounded-xl border border-border-subtle bg-surface-raised p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-bold text-content-accent">
                  Share your profile
                </h2>
                <p className="mt-1 text-sm text-content-subtle">
                  {live
                    ? 'Anyone with this link can read your published profile.'
                    : 'This is where your profile will live.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-content-subtle transition-colors hover:bg-surface-subtle hover:text-content-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <LuX aria-hidden="true" className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor={linkId} className="sr-only">
                Your profile link
              </label>
              {/* Read-only rather than disabled: a disabled field cannot be
                  focused or selected, which would take away the one way of
                  copying that works when the clipboard is refused. */}
              <input
                id={linkId}
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
                // `flex-1` only once the row is a row. In the stacked layout
                // below `sm` the container is a column, where `flex-basis: 0`
                // applies to the height — and the field collapsed to nothing,
                // which the resolution sweep caught at 320, 375 and 639px.
                className="h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-content outline-none focus-visible:border-border-accent sm:w-auto sm:flex-1"
              />
              <Button
                type="button"
                variant={copied ? 'secondary' : 'primary'}
                onClick={() => void copy()}
                className="h-10 shrink-0 gap-2 rounded-md px-4 text-sm font-semibold"
              >
                {copied ? (
                  <LuCheck aria-hidden="true" className="size-4" />
                ) : (
                  <LuCopy aria-hidden="true" className="size-4" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {live ? null : (
              <p className="flex items-start gap-2 rounded-md bg-surface-warning-subtle px-3 py-2 text-xs text-content-warning">
                <LuTriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Your profile is not published yet, so this link will not open for anyone else.
                  Publish it to make the link work.
                </span>
              </p>
            )}

            <p
              role="status"
              aria-live="polite"
              className={cn('text-xs', failed ? 'text-content-warning' : 'text-content-subtle')}
            >
              {copied
                ? 'Link copied to your clipboard.'
                : failed
                  ? 'Your browser would not let the page use the clipboard. The link is selected — copy it with your keyboard.'
                  : ''}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
