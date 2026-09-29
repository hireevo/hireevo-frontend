import { SignedInOnly } from '@/features/auth/signed-in-only.tsx';

/**
 * The admin area is for signed-in people, and being in this group is the
 * protection rather than each page remembering to ask (§6.6).
 *
 * It is not yet role-aware: the API has roles but no admin endpoints, so there
 * is nothing here that reads account data and nothing an ordinary account could
 * learn from this screen. The check that the session holds the admin role
 * belongs with the first endpoint that serves it, and is tracked with that work.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <SignedInOnly>{children}</SignedInOnly>;
}
