import {
  LuBadgeCheck,
  LuBriefcase,
  LuBuilding2,
  LuFileText,
  LuFlag,
  LuGlobe,
  LuLayoutDashboard,
  LuLink,
  LuMail,
  LuMapPin,
  LuMessageSquare,
  LuShieldCheck,
  LuStar,
  LuTags,
  LuUsers,
} from 'react-icons/lu';
import type { AdminSectionGroup } from './types.ts';

/**
 * What the admin area covers, in the order an administrator works through it.
 *
 * The screen it replaces listed seventeen entries in one column, including five
 * called `Meta_Something`, which reads as a list of database tables rather than
 * a list of jobs. The same seventeen are here, grouped by what they are for and
 * named as things rather than as tables — the meta pages are one group whose
 * entries say which page they belong to.
 *
 * Only Workers has a screen behind it. The rest carry no `href` and are drawn
 * quietly: listing them says what is coming, and a link into a page that does
 * not exist is worse than no link (§6.7).
 */
export const ADMIN_SECTIONS: AdminSectionGroup[] = [
  {
    title: 'Accounts',
    sections: [
      { label: 'Dashboard', icon: LuLayoutDashboard },
      { label: 'Workers', icon: LuUsers, href: '/admin/workers' },
      { label: 'Employers', icon: LuBriefcase },
      { label: 'Admins', icon: LuShieldCheck },
      { label: 'Reviews', icon: LuStar },
    ],
  },
  {
    title: 'Places and categories',
    sections: [
      { label: 'Countries', icon: LuGlobe },
      { label: 'States', icon: LuMapPin },
      { label: 'Cities', icon: LuBuilding2 },
      { label: 'Categories', icon: LuTags },
    ],
  },
  {
    title: 'Site content',
    sections: [
      { label: 'Page links', icon: LuLink },
      { label: 'Contacts', icon: LuMessageSquare },
      { label: 'Emails', icon: LuMail },
    ],
  },
  {
    title: 'Page metadata',
    sections: [
      { label: 'Home', icon: LuFileText },
      { label: 'Workers', icon: LuFileText },
      { label: 'Categories', icon: LuFileText },
      { label: 'Services', icon: LuFileText },
      { label: 'Contact', icon: LuFileText },
    ],
  },
];

/** The one section that has a screen, for the nav to mark as current. */
export const CURRENT_SECTION = '/admin/workers';

/** Used by the empty state and the flag filter, where a tone is needed by name. */
export const FLAG_ICON = LuFlag;
export const VERIFIED_ICON = LuBadgeCheck;
