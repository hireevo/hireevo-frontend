import { AdminOnly } from '@/features/admin/admin-only.tsx';

/**
 * The admin area is for the accounts that may moderate, and being in this group
 * is the protection rather than each page remembering to ask (§6.6).
 *
 * `AdminOnly` is a courtesy to the person, not the security: every endpoint
 * behind this screen checks the same permission for itself, so an account that
 * got past this would be answered 403 on its first request. What this avoids is
 * showing somebody a console in which nothing they press can work.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
