import type { WorkspaceSnapshot } from './types.ts';

/**
 * The dashboard exactly as the design file draws it.
 *
 * Both /dashboard and /design-system/workspace render this. The owner chose to
 * show the designed dashboard until the backend modules it describes exist —
 * skills, portfolio, services, membership and bids, project briefs — so these
 * figures are the design's sample content, not the signed-in person's.
 * /dashboard swaps in only who is signed in (see `workspaceSnapshot`), and each
 * part here should be replaced by the API's answer as its module lands.
 *
 * Actions whose destination does not exist yet carry `href: null`: they are
 * drawn as the design draws them but do not navigate, so none leads to a 404.
 */
export const DESIGN_SNAPSHOT: WorkspaceSnapshot = {
  user: { name: 'Design preview', initials: 'DP' },
  // The design draws Profile, Projects and Account with a chevron but not what
  // opens under it, so the entries are ours: what exists links to its screen,
  // and what does not yet is listed with `href: null` and shown as "Soon".
  nav: [
    { kind: 'link', label: 'Dashboard', href: '/design-system/workspace', current: true },
    {
      kind: 'menu',
      label: 'Profile',
      entries: [
        { kind: 'link', label: 'Edit profile', href: '/client-profile' },
        { kind: 'link', label: 'View public profile', href: null },
        { kind: 'link', label: 'Profile visibility', href: null },
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
  ],
  utilities: true,
  seller: {
    tier: 'New seller',
    upgrade: { label: 'Upgrade to Professional Plus', href: null },
    profileLive: true,
    available: true,
  },
  editProfile: { label: 'Edit profile', href: '/client-profile' },
  stats: [
    { id: 'skills', label: 'Skills', value: 0, trend: '+2 this month' },
    { id: 'portfolio', label: 'Portfolio projects', value: 0, trend: '+1 this month' },
    { id: 'services', label: 'Service offering', value: 0, trend: 'Ready to publish' },
  ],
  cards: [
    {
      id: 'featured',
      eyebrow: 'Featured work',
      title: 'Public benefits eligibility service redesign',
      description:
        'Reduced incomplete applications by 31 percent in the pilot and cut average support handling time by 11 minutes.',
      status: { label: 'Published', tone: 'success', variant: 'text' },
      meta: { label: 'Case study · 4 min read', tone: 'neutral' },
      action: { label: 'Review portfolio and services', href: '/client-profile' },
    },
    {
      id: 'membership',
      eyebrow: 'Membership & bids',
      title: 'See allowance, renewal and reset state',
      description:
        'Compare Free, Pro and Agency plans without changing your search rank or your HireEvo score.',
      status: { label: '3 bids left', tone: 'neutral', variant: 'pill' },
      meta: { label: '12 of 15 bids left this month', tone: 'neutral' },
      action: { label: 'Review membership', href: null },
    },
    {
      id: 'posting',
      eyebrow: 'Project posting',
      title: 'Draft, preview and publish a versioned brief',
      description:
        'Autosave, screening questions, protected files and moderation are ready whenever you decide to go live.',
      status: { label: 'Draft', tone: 'warning', variant: 'text' },
      meta: { label: 'Draft saved · 2 min ago', tone: 'accent' },
      action: { label: 'Open project workspace', href: null },
    },
  ],
  strength: {
    percent: 60,
    done: 3,
    total: 5,
    label: 'Strong',
    headline: 'You’re nearly market-ready',
    items: [
      { label: 'Identity, location & availability', done: true },
      { label: '2 languages added', done: true },
      { label: '1 experience entry added', done: true },
      { label: 'Add a portfolio video intro', done: false },
      { label: 'Connect a payment method', done: false },
    ],
    action: { label: 'Complete your profile', href: '/client-profile' },
  },
};
