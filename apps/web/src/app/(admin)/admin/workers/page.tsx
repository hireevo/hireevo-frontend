import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/admin-shell.tsx';
import { SAMPLE_WORKERS } from '@/features/admin/sample-workers.ts';
import { WorkersScreen } from '@/features/admin/workers-screen.tsx';

export const metadata: Metadata = {
  title: 'Workers · HireEvo admin',
  // An internal screen. Nothing here is for a crawler, and the group above it
  // is behind a session in any case.
  robots: { index: false, follow: false },
};

/**
 * Every worker account, for the people who moderate them.
 *
 * The rows come from a fixture while the admin API is being built: the list,
 * the filters and the paging are the real thing running over it, and
 * `sample-workers.ts` is the only module that changes when the endpoint lands.
 */
export default function AdminWorkersPage() {
  return (
    <AdminShell
      title="Worker accounts"
      description="Search every worker on HireEvo, and open one to see what is recorded about it."
      current="/admin/workers"
      admin={{ name: 'Husnain Raza', role: 'Administrator' }}
    >
      <WorkersScreen workers={SAMPLE_WORKERS} />
    </AdminShell>
  );
}
