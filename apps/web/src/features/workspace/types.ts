import type { Route } from 'next';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning';

/** Something to do. `href: null` means it has nowhere to go yet. */
export type Action = { label: string; href: Route | null };

/** An action that always has a destination. */
export type LinkAction = { label: string; href: Route };

/** One row in a header dropdown. A link with `href: null` has no screen behind it yet. */
export type MenuEntry =
  { kind: 'link'; label: string; href: Route | null } | { kind: 'sign-out'; label: string };

/** A header item: a plain link, or a dropdown of entries. */
export type NavItem =
  | { kind: 'link'; label: string; href: Route; current?: boolean }
  | { kind: 'menu'; label: string; entries: MenuEntry[] };

export type StatId = 'skills' | 'portfolio' | 'services';
export type Stat = { id: StatId; label: string; value: number; trend: string | null };

export type CardId = 'featured' | 'membership' | 'posting';
export type WorkspaceCard = {
  id: CardId;
  eyebrow: string;
  title: string;
  description: string;
  status: { label: string; tone: Tone; variant: 'pill' | 'text' } | null;
  meta: { label: string; tone: Tone } | null;
  action: Action | null;
};

export type StrengthItem = { label: string; done: boolean };

/**
 * What the card's button does. On the dashboard it goes to the profile; on the
 * profile itself there is nowhere to go, so it turns that page's sections on
 * for editing instead.
 */
export type StrengthAction = LinkAction | { label: string; onClick: () => void };

export type ProfileStrength = {
  percent: number;
  done: number;
  total: number;
  label: string | null;
  headline: string;
  items: StrengthItem[];
  action: StrengthAction;
};

export type SellerStatus = {
  tier: string;
  upgrade: Action | null;
  profileLive: boolean;
  available: boolean;
};

/** Everything the dashboard draws, as data — so /dashboard and the design preview share every component. */
export type WorkspaceSnapshot = {
  user: { name: string; initials: string };
  nav: NavItem[];
  /** The header's notification, message, help and theme icons. */
  utilities: boolean;
  /** The bar under the header. Null hides it. */
  seller: SellerStatus | null;
  editProfile: LinkAction;
  stats: Stat[];
  cards: WorkspaceCard[];
  strength: ProfileStrength;
};
