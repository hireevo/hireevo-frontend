import type { Route } from 'next';
import type { IconType } from 'react-icons';

/** Whether a worker has finished filling their profile in. */
export type ProfileStatus = 'completed' | 'not_completed';

/** Whether moderation has raised this account. */
export type FlagState = 'flagged' | 'not_flagged';

/**
 * One row of the workers list.
 *
 * Shaped after what the screen shows rather than after a table: the admin list
 * is a read of several things at once — the account, its profile and whatever
 * moderation has recorded — and the page has no business knowing which of them
 * each field came from.
 */
export interface AdminWorker {
  /** The number admins quote to each other, shown as given. */
  id: number;
  name: string;
  email: string;
  country: string;
  /** The state, province or region; some countries have none. */
  state: string | null;
  status: ProfileStatus;
  flag: FlagState;
  /** ISO date the account was created, for the detail panel. */
  joinedOn: string;
}

/**
 * An entry in the admin sidebar.
 *
 * `href` is absent for everything that has no screen yet, which is most of it:
 * those entries are drawn quietly rather than as links, so the sidebar says
 * what the admin area will hold without leading anybody into a 404 (§6.7).
 */
export interface AdminSection {
  label: string;
  icon: IconType;
  /** Typed, so a section cannot point at a route that does not exist. */
  href?: Route;
}

/** The sidebar in groups, because seventeen flat entries is a list nobody reads. */
export interface AdminSectionGroup {
  /** Names the group for both sighted readers and assistive technology. */
  title: string;
  sections: AdminSection[];
}
