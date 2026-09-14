import type { WorkspaceSnapshot } from './types.ts';

/**
 * The dashboard exactly as the design file draws it, sample content and all.
 *
 * Rendered only at /design-system/workspace, for comparing the build against
 * the design and for the resolution sweep — it is the fullest this layout ever
 * gets. None of it is anyone's data. Actions whose destination does not exist
 * yet carry `href: null` and render as unavailable rather than as dead links.
 */
export const DESIGN_SNAPSHOT: WorkspaceSnapshot = {
  user: { name: 'Design preview', initials: 'DP' },
  nav: [
    { label: 'Dashboard', href: '/design-system/workspace', current: true },
    { label: 'Profile', href: '/client-profile', menu: true },
    { label: 'Projects', href: null, menu: true },
    { label: 'Account', href: '/account', menu: true },
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
