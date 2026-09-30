import type { Metadata } from 'next';
import { AdminAccount } from '@/features/admin/admin-account.tsx';
import { AdminShell } from '@/features/admin/admin-shell.tsx';
import { WorkersPage } from '@/features/admin/workers-page.tsx';

export const metadata: Metadata = {
  title: 'Workers · HireEvo admin',
  // An internal screen. Nothing here is for a crawler, and the group above it
  // is behind a session in any case.
  robots: { index: false, follow: false },
};

/**
 * Every worker account, for the people who moderate them.
 *
 * The rows, the filters, the paging and the bans are all the API's; this page
 * is the shell around them. Who may open it is the group's layout's business,
 * and the API checks the same permission for itself on every request.
 */
export default function AdminWorkersPage() {
  return (
    <AdminShell
      title="Worker accounts"
      description="Search every worker on HireEvo, and open one to see what is recorded about it."
      current="/admin/workers"
      account={<AdminAccount />}
    >
      <WorkersPage />
    </AdminShell>
  );
}
