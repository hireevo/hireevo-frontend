import { describe, expect, it } from 'vitest';
import { landingFor } from './landing.ts';

/**
 * Where somebody lands the moment they are signed in.
 *
 * This existed twice and was right once. `signIn` returned `/client-profile`
 * for everybody, so an administrator — who has no client profile — landed on a
 * screen whose only message was "you do not have access to this resource".
 * The other copy, the one that turns away a visitor whose session is still
 * good, knew about the console. One answer now, asked from both.
 */
describe('where a signed-in person belongs', () => {
  it('sends somebody who may moderate to the console', () => {
    expect(landingFor({ permissions: ['admin.user.read', 'admin.user.restrict'] })).toBe(
      '/admin/workers',
    );
  });

  it('sends everybody else to their own profile', () => {
    expect(landingFor({ permissions: ['profile.write.own'] })).toBe('/client-profile');
    expect(landingFor({ permissions: [] })).toBe('/client-profile');
    expect(landingFor(null)).toBe('/client-profile');
  });

  /**
   * On the permission, not on the role.
   *
   * The API grants `admin.user.read` to `admin` and to `owner`, and may grant
   * it to another role tomorrow. A check for the word "admin" would hide the
   * console from somebody the API answers perfectly well.
   */
  it('asks what they may do rather than what they are called', () => {
    expect(landingFor({ permissions: ['admin.audit.read'] })).toBe('/client-profile');
    expect(landingFor({ permissions: ['admin.user.read'] })).toBe('/admin/workers');
  });
});
