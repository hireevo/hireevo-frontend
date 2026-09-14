import type { AuthenticatedUser } from '@hireevo/api-client';
import { completionOf, EMPTY_DRAFT, KEY_STEPS } from '@/features/profile/draft.ts';
import type { WorkspaceSnapshot } from './types.ts';

type NamedUser = Pick<AuthenticatedUser, 'firstName' | 'lastName' | 'username' | 'email'>;

/** The name to greet someone by: their name, else their handle, else their address's local part. */
export function displayNameOf(user: NamedUser): string {
  const full = [user.firstName, user.lastName]
    .filter((part): part is string => part !== null && part.trim() !== '')
    .join(' ')
    .trim();
  if (full !== '') return full;
  if (user.username !== null && user.username.trim() !== '') return user.username;
  return user.email.split('@')[0] ?? user.email;
}

/** "Ayesha Khan" → "AK"; a single word gives its first two letters. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '');
  const first = words[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1] ?? '') : '';
  const letters = last === '' ? first.slice(0, 2) : `${first.charAt(0)}${last.charAt(0)}`;
  return letters === '' ? '?' : letters.toUpperCase();
}

function headlineFor(percent: number): string {
  if (percent === 0) return 'Start your market-ready profile';
  if (percent === 100) return 'You’re market-ready';
  return 'You’re on your way to market-ready';
}

/**
 * What the dashboard can truthfully show today.
 *
 * The API knows who is signed in and nothing else this screen needs: there is
 * no skills, portfolio, services, membership or project-brief module, and the
 * profile routes publish no response body in the contract. So the snapshot is
 * built from the signed-in user and from the absence of anything stored —
 * counts of zero, an empty profile — and the two cards whose feature does not
 * exist say "Coming soon" instead of showing the design file's sample content.
 * The design's content is at /design-system/workspace. As each module lands,
 * its part of this function reads from it.
 */
export function workspaceSnapshot(user: AuthenticatedUser): WorkspaceSnapshot {
  const name = displayNameOf(user);
  const completion = completionOf(EMPTY_DRAFT);

  return {
    user: { name, initials: initialsOf(name) },
    nav: [
      { label: 'Dashboard', href: '/dashboard', current: true },
      { label: 'Profile', href: '/client-profile' },
      { label: 'Account', href: '/account' },
    ],
    utilities: false,
    seller: null,
    editProfile: { label: 'Edit profile', href: '/client-profile' },
    stats: [
      { id: 'skills', label: 'Skills', value: 0, trend: null },
      { id: 'portfolio', label: 'Portfolio projects', value: 0, trend: null },
      { id: 'services', label: 'Service offering', value: 0, trend: null },
    ],
    cards: [
      {
        id: 'featured',
        eyebrow: 'Featured work',
        title: 'Nothing featured yet',
        description:
          'Add a portfolio project to your profile and it is shown here — and to buyers — first.',
        status: null,
        meta: null,
        action: { label: 'Add portfolio work', href: '/client-profile' },
      },
      {
        id: 'membership',
        eyebrow: 'Membership & bids',
        title: 'Plans and bids',
        description:
          'Compare Free, Pro and Agency plans without changing your search rank or your HireEvo score.',
        status: { label: 'Coming soon', tone: 'neutral', variant: 'pill' },
        meta: null,
        action: null,
      },
      {
        id: 'posting',
        eyebrow: 'Project posting',
        title: 'Versioned project briefs',
        description:
          'Autosave, screening questions, protected files and moderation for the briefs you post.',
        status: { label: 'Coming soon', tone: 'neutral', variant: 'pill' },
        meta: null,
        action: null,
      },
    ],
    strength: {
      percent: completion.percent,
      done: completion.done,
      total: completion.total,
      label: null,
      headline: headlineFor(completion.percent),
      items: KEY_STEPS.map((step) => ({ label: step.label, done: step.isDone(EMPTY_DRAFT) })),
      action: { label: 'Complete your profile', href: '/client-profile' },
    },
  };
}
