import { describe, expect, it } from 'vitest';

import { maskEmail } from './personal-screen.tsx';

/**
 * The address is shown with most of it hidden, as the design draws it.
 *
 * Not a secrecy measure — the screen is behind a session — but it must still
 * leave enough for somebody to tell which of their addresses this is, and it
 * must never hide so little that the whole address is legible.
 */
describe('maskEmail', () => {
  it('keeps the first and last letter of the name, and the domain’s ending', () => {
    expect(maskEmail('cristofer@gmail.com')).toBe('c*******r@g***l.com');
  });

  it('leaves a very short name alone rather than turning it into nothing', () => {
    expect(maskEmail('jo@example.com')).toBe('jo@e*****e.com');
  });

  it('hides a domain with no dot in it too', () => {
    expect(maskEmail('someone@localhost')).toBe('s*****e@l********');
  });

  it('returns anything that is not an address unchanged', () => {
    expect(maskEmail('not-an-address')).toBe('not-an-address');
  });
});
