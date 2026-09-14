import type { AuthenticatedUser } from '@hireevo/api-client';
import { DESIGN_SNAPSHOT } from './design-fixture.ts';
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

/**
 * What /dashboard shows.
 *
 * The design's dashboard (design-fixture.ts) with two things made real: the
 * signed-in person in the avatar and account menu, and the Dashboard link
 * pointing here rather than at the preview. Everything else is sample content
 * shown to every account — a known gap against docs/engineering-standards.md
 * §6.7, accepted by the owner until the modules behind it exist. This function
 * is where each part switches to the API's answer as that module lands.
 */
export function workspaceSnapshot(user: AuthenticatedUser): WorkspaceSnapshot {
  const name = displayNameOf(user);

  return {
    ...DESIGN_SNAPSHOT,
    user: { name, initials: initialsOf(name) },
    nav: DESIGN_SNAPSHOT.nav.map((item) =>
      item.kind === 'link' && item.current === true ? { ...item, href: '/dashboard' } : item,
    ),
  };
}
