import type { Metadata } from 'next';
import { AdminShell } from '@/features/admin/admin-shell.tsx';
import { AdminIdentityPreview, WorkersPreview } from '@/features/admin/workers-preview.tsx';

export const metadata: Metadata = {
  title: 'Admin workers preview',
  robots: { index: false, follow: false },
};

/**
 * The admin workers screen with no session, for comparing it with the design at
 * any window size and for the layout sweep, which cannot sign in.
 */
export default function AdminPreviewPage() {
  return (
    <>
      <aside
        aria-label="Preview notice"
        className="bg-surface-warning-subtle px-4 py-2 text-center text-sm text-content-warning"
      >
        Design preview with sample content — none of it is account data.
      </aside>
      <AdminShell
        title="Worker accounts"
        description="Search every worker on HireEvo, and open one to see what is recorded about it."
        current="/admin/workers"
        // A client component, not an inline block: this page is rendered on
        // the server, and the sign-out it needs is a function — which a server
        // component may not hand across the boundary.
        account={<AdminIdentityPreview />}
      >
        <WorkersPreview />
      </AdminShell>
    </>
  );
}
