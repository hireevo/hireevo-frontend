import type { Metadata } from 'next';
import { AdminIdentity } from '@/features/admin/admin-account.tsx';
import { AdminShell } from '@/features/admin/admin-shell.tsx';
import { WorkersPreview } from '@/features/admin/workers-preview.tsx';

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
        account={
          <AdminIdentity
            name="Husnain Raza"
            role="Administrator"
            email="husnain.raza@example.com"
            // Real behaviour over sample data, as everything else on this page
            // is: the menu opens and can be swept, and the banner above already
            // says nothing here reaches an account.
            onSignOut={() => undefined}
          />
        }
      >
        <WorkersPreview />
      </AdminShell>
    </>
  );
}
