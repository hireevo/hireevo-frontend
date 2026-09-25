import type { AuthenticatedUser } from '@hireevo/api-client';
import { describe, expect, it } from 'vitest';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import {
  chromeSnapshot,
  dashboardData,
  displayNameOf,
  filledFromProfile,
  initialsOf,
} from './snapshot.ts';

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

const EMPTY_SECTIONS = {
  languages: [],
  skills: [],
  experience: [],
  education: [],
  licenses: [],
  portfolio: [],
};

/** A loaded profile with only the fields the dashboard reads; the rest is not exercised. */
const profile = (overrides: Partial<OwnProfile> = {}): OwnProfile =>
  ({
    status: 'draft',
    overview: null,
    videoIntroUrl: null,
    sections: EMPTY_SECTIONS,
    ...overrides,
  }) as unknown as OwnProfile;

describe('displayNameOf', () => {
  it('prefers the full name, then the handle, then the address', () => {
    expect(displayNameOf(user())).toBe('Ayesha Khan');
    expect(displayNameOf(user({ firstName: null, lastName: null }))).toBe('ayesha');
    expect(displayNameOf(user({ firstName: null, lastName: null, username: null }))).toBe(
      'ayesha.khan',
    );
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

describe('chromeSnapshot', () => {
  it('puts the signed-in person in the avatar', () => {
    expect(chromeSnapshot(user()).user).toEqual({ name: 'Ayesha Khan', initials: 'AK' });
  });

  /**
   * Dashboard names where a signed-in person already is.
   *
   * It carries no link for now: until there is somewhere else for it to lead, a
   * link back to the page it is on is a control that appears to do nothing.
   * What still matters is that nothing in the header points at the design
   * preview, which is a fixture and must never be reachable from production.
   */
  it('marks Dashboard as where you are, and points nothing at the design preview', () => {
    const { nav } = chromeSnapshot(user());
    const current = nav.find((item) => item.kind === 'link' && item.current === true);
    expect(current?.label).toBe('Dashboard');
    expect(current?.kind === 'link' ? current.href : undefined).toBeNull();
    expect(JSON.stringify(nav)).not.toContain('/design-system');
  });

  it('gives every dropdown entry a real route or no link at all', () => {
    const entries = chromeSnapshot(user()).nav.flatMap((item) =>
      item.kind === 'menu' ? item.entries : [],
    );
    for (const entry of entries) {
      if (entry.kind === 'link' && entry.href !== null) {
        expect([
          '/dashboard',
          '/client-profile',
          '/client-profile?edit=1',
          '/profile/setup',
          '/profile/preview',
          '/account',
        ]).toContain(entry.href);
      }
    }
  });
});

describe('filledFromProfile', () => {
  it('reads a section as filled only when it has something in it', () => {
    expect(filledFromProfile(profile())).toMatchObject({
      about: false,
      skills: false,
      portfolio: false,
      videoIntro: false,
    });
    expect(
      filledFromProfile(
        profile({
          overview: 'A biography.',
          videoIntroUrl: 'https://vimeo.com/1',
          sections: { ...EMPTY_SECTIONS, skills: [{ name: 'UX' }] as never },
        }),
      ),
    ).toMatchObject({ about: true, videoIntro: true, skills: true });
  });
});

describe('dashboardData', () => {
  it('counts the real sections, with no invented trend', () => {
    const data = dashboardData(
      profile({
        sections: {
          ...EMPTY_SECTIONS,
          skills: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] as never,
          portfolio: [{ title: 'One', summary: null, url: null, files: [] }] as never,
          licenses: [{ name: 'Cert', files: [] }] as never,
        },
      }),
    );
    expect(data.stats).toEqual([
      { id: 'skills', label: 'Skills', value: 3, trend: null },
      { id: 'portfolio', label: 'Portfolio projects', value: 1, trend: null },
      { id: 'certifications', label: 'Certifications', value: 1, trend: null },
    ]);
  });

  it('derives the strength from the profile, not a fixture', () => {
    const empty = dashboardData(profile());
    expect(empty.strength.percent).toBe(0);
    expect(empty.strength.action).toEqual({
      label: 'Complete your profile',
      href: '/client-profile',
    });

    const full = dashboardData(
      profile({
        overview: 'Bio.',
        videoIntroUrl: 'https://vimeo.com/1',
        sections: {
          languages: [{ name: 'English' }] as never,
          skills: [{ name: 'UX' }] as never,
          experience: [{ role: 'Lead' }] as never,
          education: [{ institution: 'CSM' }] as never,
          licenses: [{ name: 'Cert', files: [] }] as never,
          portfolio: [{ title: 'One', summary: null, url: null, files: [] }] as never,
        },
      }),
    );
    expect(full.strength.percent).toBe(100);
    expect(full.editProfile.label).toBe('Edit profile');
  });

  it('shows the real first portfolio piece, or a prompt to add one', () => {
    const withWork = dashboardData(
      profile({
        status: 'published',
        sections: {
          ...EMPTY_SECTIONS,
          portfolio: [
            { title: 'Fintech dashboard', summary: 'A case study.', url: null, files: [] },
          ] as never,
        },
      }),
    );
    const featured = withWork.cards.find((card) => card.id === 'featured');
    expect(featured?.title).toBe('Fintech dashboard');
    expect(featured?.description).toBe('A case study.');
    expect(featured?.status?.label).toBe('Published');

    const empty = dashboardData(profile()).cards.find((card) => card.id === 'featured');
    expect(empty?.title).toBe('Add your first project');
  });

  it('shows no invented figures on the unbuilt modules', () => {
    const data = dashboardData(profile());
    const serialised = JSON.stringify(data.cards);
    expect(serialised).not.toContain('bids left');
    expect(serialised).not.toContain('Draft saved');
    // The unbuilt-module cards carry no status or meta figures at all.
    for (const card of data.cards.filter((c) => c.id !== 'featured')) {
      expect(card.status).toBeNull();
      expect(card.meta).toBeNull();
    }
  });

  it('never links anywhere that does not exist', () => {
    const data = dashboardData(profile());
    const hrefs = [
      data.editProfile.href,
      'href' in data.strength.action ? data.strength.action.href : null,
      ...data.cards.map((card) => card.action?.href ?? null),
    ].filter((href) => href !== null);
    for (const href of hrefs) expect(['/client-profile']).toContain(href);
  });
});
