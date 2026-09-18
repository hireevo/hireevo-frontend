'use client';

import { env } from '@/env';

/**
 * Google reCAPTCHA v2 — the "I'm not a robot" checkbox — loaded only when a site
 * key is configured.
 *
 * v2 is a visible widget: the person ticks a box (and occasionally solves an
 * image challenge), which yields a single-use token the API forwards to Google.
 * With no site key set every export here is inert and the token is null, so
 * local development, CI and the tests run without a Google account — and the API,
 * which also skips verification when its secret is unset, accepts the sign-up.
 */
export const recaptchaSiteKey = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
export const recaptchaEnabled = recaptchaSiteKey !== undefined;

/** The slice of the v2 API we use (explicit render). */
export interface GrecaptchaV2 {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => number;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaV2;
  }
}

let scriptPromise: Promise<void> | null = null;

/**
 * Loads the reCAPTCHA v2 script once and resolves when `grecaptcha.render` is
 * ready. `render=explicit` keeps Google from auto-scanning the page, so React
 * stays in control of when and where the widget mounts.
 */
export function loadRecaptcha(): Promise<void> {
  if (recaptchaSiteKey === undefined) return Promise.resolve();
  if (scriptPromise !== null) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window.grecaptcha?.render === 'function') {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha]');
    const onReady = () => {
      // The script's load event can fire a beat before `render` is attached.
      const wait = (tries: number) => {
        if (typeof window.grecaptcha?.render === 'function') resolve();
        else if (tries > 0) setTimeout(() => wait(tries - 1), 100);
        else reject(new Error('reCAPTCHA loaded without a render function'));
      };
      wait(30);
    };

    if (existing !== null) {
      existing.addEventListener('load', onReady);
      onReady();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.recaptcha = 'true';
    script.addEventListener('load', onReady);
    script.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load')));
    document.head.appendChild(script);
  });

  return scriptPromise;
}
