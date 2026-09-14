import type { Route } from 'next';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning';

/** Something to do. `href: null` means it has nowhere to go yet, and renders as unavailable. */
export type Action = { label: string; href: Route | null };

/** An action that always has a destination. */
export type LinkAction = { label: string; href: Route };

export type NavItem = { label: string; href: Route | null; current?: boolean; menu?: boolean };

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
export type ProfileStrength = {
  percent: number;
  done: number;
  total: number;
  label: string | null;
  headline: string;
  items: StrengthItem[];
  action: LinkAction;
};

export type SellerStatus = {
  tier: string;
  upgrade: Action | null;
  profileLive: boolean;
  available: boolean;
};

/** Everything the dashboard draws, as data — so the real page and the design preview share every component. */
export type WorkspaceSnapshot = {
  user: { name: string; initials: string };
  nav: NavItem[];
  /** The header's notification, message, help and theme icons. Design preview only. */
  utilities: boolean;
  /** The bar under the header. Null until there is a seller status to show. */
  seller: SellerStatus | null;
  editProfile: LinkAction;
  stats: Stat[];
  cards: WorkspaceCard[];
  strength: ProfileStrength;
};
