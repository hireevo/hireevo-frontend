/**
 * The longest a video introduction link may be, mirrored from the contract's
 * `videoIntroUrl`. Asserted against the pinned spec in `video-url.test.ts` so a
 * change to the column cannot pass this by unnoticed (§6.1).
 */
export const VIDEO_INTRO_URL_MAX = 500;

/** The one message a bad link shows, matching what the API says when it refuses. */
export const VIDEO_URL_ERROR =
  'Use a full http or https link, for example https://vimeo.com/123456789';

/**
 * Whether a video introduction link is one the profile can store, and the
 * message to show when it is not.
 *
 * Mirrors the API's `VideoUrlSchema`, so the browser refuses a link before a
 * save for the same reason the server would after one: an empty value is fine —
 * the field is optional, and clearing it is how the video is removed — and
 * anything else has to be a full `http` or `https` link within the length the
 * column takes. The scheme is checked by parsing the URL rather than by a
 * pattern, the way the server does, because a `javascript:` or `data:` link
 * rendered as a link on a public profile is cross-site scripting with extra
 * steps, and "looks like a URL" is not the same as "is a safe one".
 */
export function validateVideoUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (trimmed.length > VIDEO_INTRO_URL_MAX) return VIDEO_URL_ERROR;

  try {
    const { protocol } = new URL(trimmed);
    if (protocol !== 'http:' && protocol !== 'https:') return VIDEO_URL_ERROR;
  } catch {
    return VIDEO_URL_ERROR;
  }

  return null;
}
