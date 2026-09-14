import type { AuthenticatedUser } from '@hireevo/api-client';
import { describe, expect, it } from 'vitest';
import { KEY_STEPS } from '@/features/profile/draft.ts';
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
  it('claims nothing the API cannot say', () => {
    const snapshot = workspaceSnapshot(user());
    expect(snapshot.seller).toBeNull();
    expect(snapshot.utilities).toBe(false);
    expect(snapshot.stats.map((stat) => stat.trend)).toEqual([null, null, null]);
    expect(snapshot.strength.label).toBeNull();
  });

  it('gives every action a destination, or no action at all', () => {
    // §6.7: whatever the design shows, a link to nowhere on the real dashboard
    // is a defect. Unavailable actions belong to the design preview only.
    const snapshot = workspaceSnapshot(user());
    const actions = [
      snapshot.editProfile,
      snapshot.strength.action,
      ...snapshot.cards.flatMap((card) => (card.action === null ? [] : [card.action])),
      ...snapshot.nav,
    ];
    for (const action of actions) expect(action.href).not.toBeNull();
  });

  it('says a feature that does not exist is coming, instead of drawing sample content', () => {
    const cards = workspaceSnapshot(user()).cards.filter((card) => card.id !== 'featured');
    for (const card of cards) {
      expect(card.status?.label).toBe('Coming soon');
      expect(card.action).toBeNull();
      expect(card.meta).toBeNull();
    }
  });

  it('counts profile steps from the list the profile screen uses', () => {
    const { strength } = workspaceSnapshot(user());
    expect(strength.total).toBe(KEY_STEPS.length);
    expect(strength.items.map((item) => item.label)).toEqual(KEY_STEPS.map((step) => step.label));
  });
});
