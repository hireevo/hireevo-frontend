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

/**
 * The still frame for a video introduction, where one can be had for free.
 *
 * YouTube publishes a thumbnail at a fixed address built from the video's id,
 * so the picture costs nothing but the image request — no API key, no call to
 * ask for it. Every other host needs an interrogation the page has no reason to
 * make, so they get no frame and the tile stays a play button.
 *
 * `hqdefault` rather than `maxresdefault`: the larger one is missing for any
 * video that was never uploaded at that size, and a missing frame is worse than
 * a smaller one.
 */
export function videoThumbnail(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '');
  const path = parsed.pathname.replace(/^\//, '');
  const id =
    host === 'youtu.be'
      ? path
      : host === 'youtube.com' || host === 'youtube-nocookie.com'
        ? (parsed.searchParams.get('v') ?? path.replace(/^(embed|shorts|v)\//, ''))
        : null;

  // Eleven characters of YouTube's own alphabet. Anything else is a link that
  // happens to be on the domain — a channel, a playlist page, a search.
  return id !== null && /^[\w-]{11}$/.test(id)
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : null;
}
