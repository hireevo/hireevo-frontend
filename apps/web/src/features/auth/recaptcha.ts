'use client';

import { env } from '@/env';

/**
 * Google reCAPTCHA v3, loaded only when a site key is configured.
 *
 * v3 is invisible: there is no checkbox. The script runs in the background and,
 * on an action we ask for, returns a token that the API forwards to Google to
 * score. When no site key is set — local development, CI — every function here
 * is a no-op and the token is null, so the form works exactly as before and the
 * API, which also skips verification when its secret is unset, accepts it.
 */
const SITE_KEY = env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/** The slice of the reCAPTCHA global we use. */
interface Grecaptcha {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loads the reCAPTCHA script once, and resolves when its global is ready. */
function load(siteKey: string): Promise<void> {
  if (scriptPromise !== null) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-recaptcha]');
    if (existing !== null) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptcha = 'true';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('reCAPTCHA failed to load')));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Whether bot protection is switched on for this build. */
export const recaptchaEnabled = SITE_KEY !== undefined;

/**
 * A fresh reCAPTCHA token for an action, or null when protection is off.
 *
 * Never throws: if the script cannot load or score, it returns null rather than
 * blocking a real person from signing up. The API decides whether a missing or
 * low-scoring token is acceptable — the form's job is only to attach one when it
 * can.
 */
export async function executeRecaptcha(action: string): Promise<string | null> {
  if (SITE_KEY === undefined) return null;

  try {
    await load(SITE_KEY);
    const grecaptcha = window.grecaptcha;
    if (grecaptcha === undefined) return null;

    await new Promise<void>((resolve) => grecaptcha.ready(() => resolve()));
    return await grecaptcha.execute(SITE_KEY, { action });
  } catch {
    return null;
  }
}

/**
 * Starts loading the script ahead of the first submit, so the token is ready
 * when the person presses the button rather than adding a wait to it.
 */
export function preloadRecaptcha(): void {
  if (SITE_KEY !== undefined) void load(SITE_KEY);
}
