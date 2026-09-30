import type { Route } from 'next';
import type { AuthenticatedUser } from '@hireevo/api-client';

/**
 * What the moderation console's own list asks of whoever opens it.
 *
 * A permission rather than a role name: the API grants this to more than one
 * role and may grant it to another tomorrow, and a client that checks for the
 * word "admin" would then hide the console from somebody the API answers.
 */
export const CONSOLE_PERMISSION = 'admin.user.read';

/**
 * Where somebody belongs the moment they are signed in.
 *
 * In one place because it is asked from two: the form that has just signed
 * somebody in, and the auth pages that turn away a visitor whose session is
 * still good. It was answered in only one of them, and an administrator
 * signing in landed on a client profile they do not have — the screen then
 * said "you do not have access to this resource", which is true and useless.
 */
export function landingFor(user: Pick<AuthenticatedUser, 'permissions'> | null): Route {
  return user?.permissions.includes(CONSOLE_PERMISSION) === true
    ? '/admin/workers'
    : '/client-profile';
}
