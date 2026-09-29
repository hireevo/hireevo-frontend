'use client';

import { env } from '@/env';

/**
 * Cloudflare Turnstile — the bot check on sign-in and sign-up — loaded only when
 * a site key is configured.
 *
 * Turnstile is a visible widget that usually passes without any interaction and
 * shows a checkbox only when it is unsure; there are no image puzzles. Solving
 * it yields a single-use token the API forwards to Cloudflare. With no site key
 * set every export here is inert and the token is null, so local development,
 * CI and the tests run without a Cloudflare account — and the API, which also
 * skips verification when its secret is unset, accepts the request.
 */
export const turnstileSiteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
export const turnstileEnabled = turnstileSiteKey !== undefined;

/** The slice of the Turnstile API we use (explicit render). */
export interface Turnstile {
  render: (
    container: HTMLElement,
    params: {
      sitekey: string;
      /** `flexible` fills the container between 300px and 600px; the others are fixed widths. */
      size?: 'normal' | 'flexible' | 'compact';
      theme?: 'light' | 'dark' | 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string | undefined;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<void> | null = null;

/**
 * Loads the Turnstile script once and resolves when `turnstile.render` is
 * ready. `render=explicit` keeps Cloudflare from auto-scanning the page, so
 * React stays in control of when and where the widget mounts.
 */
export function loadTurnstile(): Promise<void> {
  if (turnstileSiteKey === undefined) return Promise.resolve();
  if (scriptPromise !== null) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window.turnstile?.render === 'function') {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    const onReady = () => {
      // The script's load event can fire a beat before `render` is attached.
      const wait = (tries: number) => {
        if (typeof window.turnstile?.render === 'function') resolve();
        else if (tries > 0) setTimeout(() => wait(tries - 1), 100);
        else reject(new Error('Turnstile loaded without a render function'));
      };
      wait(30);
    };

    if (existing !== null) {
      existing.addEventListener('load', onReady);
      onReady();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = 'true';
    script.addEventListener('load', onReady);
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
    document.head.appendChild(script);
  });

  return scriptPromise;
}
