'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { loadRecaptcha, recaptchaSiteKey } from './recaptcha.ts';

export interface RecaptchaHandle {
  /** Clears a solved checkbox, so the next submit needs a fresh tick. */
  reset: () => void;
}

/**
 * The "I'm not a robot" checkbox.
 *
 * Renders nothing when no site key is configured, so the form is unchanged
 * locally. Otherwise it mounts the v2 widget once and reports the token through
 * `onChange` — a real token when the box is ticked, null when it expires or the
 * widget errors. Tokens are single-use, so the form resets it after each submit.
 */
export const RecaptchaCheckbox = forwardRef<
  RecaptchaHandle,
  { onChange: (token: string | null) => void }
>(function RecaptchaCheckbox({ onChange }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  // Held in a ref so the render effect can run once and still call the latest
  // handler, rather than re-mounting the widget when the parent re-renders.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
      },
    }),
    [],
  );

  useEffect(() => {
    if (recaptchaSiteKey === undefined) return;
    const siteKey = recaptchaSiteKey;
    let cancelled = false;

    void loadRecaptcha().then(() => {
      if (cancelled || container.current === null || widgetId.current !== null) return;
      widgetId.current =
        window.grecaptcha?.render(container.current, {
          sitekey: siteKey,
          callback: (token) => onChangeRef.current(token),
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => onChangeRef.current(null),
        }) ?? null;
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (recaptchaSiteKey === undefined) return null;
  return <div ref={container} />;
});
