'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { loadTurnstile, turnstileSiteKey } from './turnstile.ts';

export interface TurnstileHandle {
  /** Clears a solved widget, so the next submit needs a fresh pass. */
  reset: () => void;
}

/**
 * The Turnstile bot check.
 *
 * Renders nothing when no site key is configured, so the form is unchanged
 * locally. Otherwise it mounts the widget once and reports the token through
 * `onChange` — a real token once the check passes, null when it expires or the
 * widget errors. Tokens are single-use, so the form resets it after each submit.
 */
export const TurnstileWidget = forwardRef<
  TurnstileHandle,
  { onChange: (token: string | null) => void }
>(function TurnstileWidget({ onChange }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Held in a ref so the render effect can run once and still call the latest
  // handler, rather than re-mounting the widget when the parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetId.current !== null) window.turnstile?.reset(widgetId.current);
      },
    }),
    [],
  );

  useEffect(() => {
    if (turnstileSiteKey === undefined) return;
    const siteKey = turnstileSiteKey;
    let cancelled = false;

    void loadTurnstile().then(() => {
      if (cancelled || container.current === null || widgetId.current !== null) return;
      widgetId.current =
        window.turnstile?.render(container.current, {
          sitekey: siteKey,
          // Fills the column, so the widget is as wide as the fields above it
          // rather than a fixed 300px box sitting at the left edge.
          size: 'flexible',
          // The designs are light-only (the app never follows the OS theme).
          theme: 'light',
          callback: (token) => onChangeRef.current(token),
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => onChangeRef.current(null),
        }) ?? null;
    });

    return () => {
      cancelled = true;
      // Unmounting the form (route change, StrictMode's double mount) removes
      // the widget too; otherwise a second mount renders a second one.
      if (widgetId.current !== null) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (turnstileSiteKey === undefined) return null;

  /*
   * The flexible widget is never narrower than 300px. A 320px phone leaves
   * 272px once the column has its gutters, so the page scrolled sideways —
   * which §6.11 allows at no width. Below 360px the widget alone reaches into
   * the gutter; everything else keeps it.
   */
  return <div ref={container} className="max-[359px]:-mx-4" />;
});
