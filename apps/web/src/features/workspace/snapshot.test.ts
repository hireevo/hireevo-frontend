import type { AuthenticatedUser } from '@hireevo/api-client';
import { describe, expect, it } from 'vitest';
import { DESIGN_SNAPSHOT } from './design-fixture.ts';
import { displayNameOf, initialsOf, workspaceSnapshot } from './snapshot.ts';

const user = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'u1',
  email: 'ayesha.khan@example.com',
  firstName: 'Ayesha',
  lastName: 'Khan',
  username: 'ayesha',
  status: 'active',
  emailVerified: true,
  roles: [],
  permissions: [],
  ...overrides,
});

describe('displayNameOf', () => {
  it('prefers the full name', () => {
    expect(displayNameOf(user())).toBe('Ayesha Khan');
  });

  it('falls back to the handle, then to the address', () => {
    expect(displayNameOf(user({ firstName: null, lastName: null }))).toBe('ayesha');
    expect(displayNameOf(user({ firstName: null, lastName: null, username: null }))).toBe(
      'ayesha.khan',
    );
  });

  it('ignores a blank half of a name', () => {
    expect(displayNameOf(user({ lastName: '   ' }))).toBe('Ayesha');
  });
});

describe('initialsOf', () => {
  it.each([
    ['Ayesha Khan', 'AK'],
    ['Ayesha Noor Khan', 'AK'],
    ['blacksmith90', 'BL'],
    ['a', 'A'],
    ['   ', '?'],
  ])('%j gives %s', (name, expected) => {
    expect(initialsOf(name)).toBe(expected);
  });
});

describe('workspaceSnapshot', () => {
  it('shows the designed dashboard', () => {
    const snapshot = workspaceSnapshot(user());
    expect(snapshot.stats).toEqual(DESIGN_SNAPSHOT.stats);
    expect(snapshot.cards).toEqual(DESIGN_SNAPSHOT.cards);
    expect(snapshot.strength).toEqual(DESIGN_SNAPSHOT.strength);
    expect(snapshot.seller).toEqual(DESIGN_SNAPSHOT.seller);
  });

  it('puts the signed-in person in the avatar, not the design’s initials', () => {
    expect(workspaceSnapshot(user()).user).toEqual({ name: 'Ayesha Khan', initials: 'AK' });
  });

  it('gives every dropdown entry a real route or no link at all', () => {
    const entries = workspaceSnapshot(user()).nav.flatMap((item) =>
      item.kind === 'menu' ? item.entries : [],
    );
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      if (entry.kind === 'link' && entry.href !== null) {
        expect(['/dashboard', '/client-profile', '/profile/setup', '/account']).toContain(
          entry.href,
        );
      }
    }
  });

  it('points Dashboard at /dashboard, not at the preview', () => {
    const { nav } = workspaceSnapshot(user());
    const current = nav.find((item) => item.kind === 'link' && item.current === true);
    expect(current?.kind === 'link' ? current.href : null).toBe('/dashboard');
    expect(JSON.stringify(nav)).not.toContain('/design-system/workspace');
  });

  it('never links to a screen that does not exist', () => {
    // An action with no screen behind it carries `href: null` and is drawn
    // without a link; every href that is set must be a real route.
    const snapshot = workspaceSnapshot(user());
    const strength = snapshot.strength.action;
    const hrefs = [
      snapshot.editProfile.href,
      // The card's button either goes somewhere or acts in place; only the one
      // that goes somewhere has a route to check.
      'href' in strength ? strength.href : null,
      snapshot.seller?.upgrade?.href ?? null,
      ...snapshot.cards.map((card) => card.action?.href ?? null),
      ...snapshot.nav.flatMap((item) =>
        item.kind === 'link'
          ? [item.href]
          : item.entries.map((entry) => (entry.kind === 'link' ? entry.href : null)),
      ),
    ].filter((href) => href !== null);
    for (const href of hrefs)
      expect(['/dashboard', '/client-profile', '/profile/setup', '/account']).toContain(href);
  });
});
