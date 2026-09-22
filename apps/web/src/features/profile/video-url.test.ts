import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { VIDEO_INTRO_URL_MAX, VIDEO_URL_ERROR, validateVideoUrl } from './video-url.ts';

/**
 * The client rule, checked against the one the API publishes.
 *
 * The browser refuses a bad link before a save so the person is told at once;
 * that only helps if it refuses exactly what the server would, so the length is
 * read from the pinned spec rather than trusted as a copy (§6.1). The scheme
 * rule is a `refine` in the contract and has no shape in the document, so it is
 * mirrored in `validateVideoUrl` and exercised below rather than asserted here.
 */
const require = createRequire(import.meta.url);
const spec = JSON.parse(
  readFileSync(require.resolve('@hireevo/api-client/openapi.json'), 'utf8'),
) as {
  components: {
    schemas: {
      UpdateProfileRequest: {
        properties: {
          profile: {
            properties: {
              videoIntroUrl: { anyOf: { maxLength?: number }[] };
            };
          };
        };
      };
    };
  };
};

describe('what this app believes about a video link', () => {
  it('agrees with the API about the longest one', () => {
    const variants =
      spec.components.schemas.UpdateProfileRequest.properties.profile.properties.videoIntroUrl
        .anyOf;
    const max = variants.find((variant) => typeof variant.maxLength === 'number')?.maxLength;
    expect(max).toBe(VIDEO_INTRO_URL_MAX);
  });
});

describe('validateVideoUrl', () => {
  it('accepts nothing at all, because the video is optional', () => {
    expect(validateVideoUrl('')).toBeNull();
    expect(validateVideoUrl('   ')).toBeNull();
  });

  it.each([
    'https://vimeo.com/123456789',
    'http://example.com/watch?v=abc',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    '  https://vimeo.com/1  ',
  ])('accepts a full http or https link (%s)', (link) => {
    expect(validateVideoUrl(link)).toBeNull();
  });

  it.each([
    ['a link with no scheme', 'vimeo.com/123456789'],
    ['bare text', 'my video'],
    ['a script URL', 'javascript:alert(1)'],
    ['a data URL', 'data:text/html,<script>alert(1)</script>'],
    ['an ftp URL', 'ftp://example.com/clip.mp4'],
  ])('refuses %s', (_why, link) => {
    expect(validateVideoUrl(link)).toBe(VIDEO_URL_ERROR);
  });

  it('refuses one past the length the column takes', () => {
    const tooLong = `https://vimeo.com/${'9'.repeat(VIDEO_INTRO_URL_MAX)}`;
    expect(tooLong.length).toBeGreaterThan(VIDEO_INTRO_URL_MAX);
    expect(validateVideoUrl(tooLong)).toBe(VIDEO_URL_ERROR);
  });
});
