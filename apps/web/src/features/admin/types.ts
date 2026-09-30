import type { Route } from 'next';
import type { IconType } from 'react-icons';

/** Whether a worker has finished filling their profile in. */
export type ProfileStatus = 'completed' | 'not_completed';

/**
 * Whether moderation has closed this account.
 *
 * The screen this replaces called it "flagged", and its menu called the way
 * back "Unban User" — two words for one thing, and the milder of them on the
 * column an administrator reads. Banned is what it does: the person cannot sign
 * in. It is named that here so nobody has to learn which is which.
 */
export type AccountState = 'active' | 'banned';

/**
 * One row of the workers list.
 *
 * Shaped after what the screen shows rather than after a table: the admin list
 * is a read of several things at once — the account, its profile and whatever
 * moderation has recorded — and the page has no business knowing which of them
 * each field came from.
 */
export interface AdminWorker {
  /**
   * The account's own id.
   *
   * A uuid rather than the sequential number the screen this replaces showed:
   * that number was the row's, and this platform's accounts do not have one.
   * It is out of the table — twelve columns of hexadecimal help nobody scan a
   * list — and in the detail box, where somebody quoting it can read it whole.
   */
  id: string;
  name: string;
  /** What their profile calls them, when that is not the account's name. */
  displayName: string | null;
  email: string;
  country: string;
  /** The state, province or region; some countries have none. */
  state: string | null;
  status: ProfileStatus;
  account: AccountState;
  /** ISO date the account was created, for the detail panel. */
  joinedOn: string;
  /**
   * A name this worker has asked to be known by, waiting for a decision.
   *
   * It rides with the row because what an administrator needs in order to
   * decide is who is asking, and that is the row they are already reading.
   */
  nameChange: PendingNameChange | null;
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

/** A name somebody has asked to be known by, and when they asked. */
export interface PendingNameChange {
  id: string;
  firstName: string | null;
  lastName: string | null;
  requestedAt: string;
  /** The two halves as one line, which is what the screen shows. */
  wanted: string;
}

/** The sidebar in groups, because seventeen flat entries is a list nobody reads. */
export interface AdminSectionGroup {
  /** Names the group for both sighted readers and assistive technology. */
  title: string;
  sections: AdminSection[];
}
