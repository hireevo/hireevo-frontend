import type { Route } from 'next';
import type { AuthenticatedUser } from '@hireevo/api-client';
import type { OwnProfile } from '@/features/profile-setup/api.ts';
import { NOTHING_FILLED, completionOf, type SectionsFilled } from '@/features/profile/draft.ts';
import type { NavItem, ProfileStrength, Stat, WorkspaceCard } from './types.ts';

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

const EDIT_PROFILE: Route = '/client-profile';

/**
 * The header navigation of every signed-in page.
 *
 * Structure the design draws; each entry links to the screen that exists or
 * carries `href: null` and is shown as "Soon" where its module has not been
 * built. Unlike the design preview, Dashboard points here rather than at the
 * `/design-system` copy. This is production's own — it does not read from the
 * design fixture, so nothing invented can reach a signed-in person through it.
 */
export const WORKSPACE_NAV: NavItem[] = [
  // Not a link for now. The dashboard is the screen a signed-in person lands
  // on, so the item names where they already are — and until there is somewhere
  // else for it to lead, a link that reloads the same page is a control that
  // appears to do nothing.
  { kind: 'link', label: 'Dashboard', href: null, current: true },
  {
    kind: 'menu',
    label: 'Profile',
    entries: [
      // Straight into the editable profile rather than the setup wizard: this
      // is the screen the work is done on, and `?edit=1` opens it with its
      // pencils already on.
      { kind: 'link', label: 'Edit profile', href: `${EDIT_PROFILE}?edit=1` as Route },
      { kind: 'link', label: 'View public profile', href: '/profile/preview' },
      { kind: 'link', label: 'Profile visibility', href: EDIT_PROFILE },
    ],
  },
  {
    kind: 'menu',
    label: 'Projects',
    entries: [
      { kind: 'link', label: 'Project workspace', href: null },
      { kind: 'link', label: 'Post a project brief', href: null },
      { kind: 'link', label: 'Proposals and bids', href: null },
    ],
  },
  {
    kind: 'menu',
    label: 'Account',
    entries: [
      { kind: 'link', label: 'Account settings', href: '/account' },
      { kind: 'link', label: 'Membership and bids', href: null },
      { kind: 'link', label: 'Payment methods', href: null },
      { kind: 'sign-out', label: 'Sign out' },
    ],
  },
];

/** What the header and seller strip need — none of it invented, all from who is signed in. */
export type ChromeSnapshot = {
  user: { name: string; initials: string };
  nav: NavItem[];
  utilities: boolean;
};

export function chromeSnapshot(user: AuthenticatedUser): ChromeSnapshot {
  const name = displayNameOf(user);
  return { user: { name, initials: initialsOf(name) }, nav: WORKSPACE_NAV, utilities: true };
}

/** Which sections a loaded profile has something in — the real basis for the strength card. */
export function filledFromProfile(profile: OwnProfile): SectionsFilled {
  const s = profile.sections;
  return {
    ...NOTHING_FILLED,
    about: profile.overview !== null && profile.overview.trim() !== '',
    skills: s.skills.length > 0,
    experience: s.experience.length > 0,
    education: s.education.length > 0,
    certifications: s.licenses.length > 0,
    portfolio: s.portfolio.length > 0,
    videoIntro: profile.videoIntroUrl !== null && profile.videoIntroUrl.trim() !== '',
  };
}

/** Everything the dashboard body draws — derived from the signed-in person's own profile. */
export type DashboardData = {
  editProfile: { label: string; href: Route };
  stats: Stat[];
  cards: WorkspaceCard[];
  strength: ProfileStrength;
};

export function dashboardData(profile: OwnProfile): DashboardData {
  const s = profile.sections;
  const completion = completionOf(filledFromProfile(profile));
  const complete = completion.percent === 100;

  return {
    editProfile: {
      label: complete ? 'Edit profile' : 'Complete your profile',
      href: EDIT_PROFILE,
    },
    stats: [
      { id: 'skills', label: 'Skills', value: s.skills.length, trend: null },
      { id: 'portfolio', label: 'Portfolio projects', value: s.portfolio.length, trend: null },
      { id: 'certifications', label: 'Certifications', value: s.licenses.length, trend: null },
    ],
    cards: dashboardCards(profile),
    strength: {
      percent: completion.percent,
      done: completion.done,
      total: completion.total,
      label: completion.label,
      headline: completion.headline,
      items: completion.items,
      action: {
        label: complete ? 'Edit profile' : 'Complete your profile',
        href: EDIT_PROFILE,
      },
    },
  };
}

/**
 * The feature cards, from real state rather than the design's sample content.
 *
 * The first is the person's own portfolio — a real piece if they have one, or an
 * empty prompt to add the first. The other two describe modules that do not
 * exist yet (membership and bids, project posting); they carry no status or
 * figures, so nothing on them is presented as the person's own until those
 * modules land and can fill them in.
 */
function dashboardCards(profile: OwnProfile): WorkspaceCard[] {
  const piece = profile.sections.portfolio[0];
  const published = profile.status === 'published';

  const featured: WorkspaceCard =
    piece === undefined
      ? {
          id: 'featured',
          eyebrow: 'Portfolio',
          title: 'Add your first project',
          description:
            'Show buyers the work you want to be hired for. A piece with a cover image and a short summary is what makes a profile worth reading.',
          status: null,
          meta: null,
          action: { label: 'Add a project', href: EDIT_PROFILE },
        }
      : {
          id: 'featured',
          eyebrow: 'Featured work',
          title: piece.title,
          description:
            piece.summary !== null && piece.summary.trim() !== ''
              ? piece.summary
              : 'One of the projects on your profile.',
          status: published
            ? { label: 'Published', tone: 'success', variant: 'text' }
            : { label: 'Draft', tone: 'warning', variant: 'text' },
          meta: null,
          action: { label: 'Review portfolio', href: EDIT_PROFILE },
        };

  return [
    featured,
    {
      id: 'membership',
      eyebrow: 'Membership & bids',
      title: 'Plans and bid allowance',
      description:
        'Compare Free, Pro and Agency plans and track how many bids you have left. This arrives with the membership module.',
      status: null,
      meta: null,
      action: null,
    },
    {
      id: 'posting',
      eyebrow: 'Project posting',
      title: 'Post a project brief',
      description:
        'Draft, preview and publish a versioned brief with screening questions and protected files. This arrives with the projects module.',
      status: null,
      meta: null,
      action: null,
    },
  ];
}
