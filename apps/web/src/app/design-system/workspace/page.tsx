import type { Metadata } from 'next';
import { DESIGN_SNAPSHOT } from '@/features/workspace/design-fixture.ts';
import { WorkspaceDashboard } from '@/features/workspace/workspace-dashboard.tsx';

export const metadata: Metadata = {
  title: 'Workspace dashboard preview',
  robots: { index: false, follow: false },
};

/**
 * The dashboard with the design file's content and no account, for comparing
 * the build with the design at any window size and for the layout sweep, which
 * cannot sign in. /dashboard shows the same content to a signed-in person.
 */
export default function WorkspacePreviewPage() {
  return (
    <>
      <p className="bg-surface-warning-subtle px-4 py-2 text-center text-sm text-content-warning">
        Design preview with sample content from the design file — none of it is account data.
      </p>
      <WorkspaceDashboard snapshot={DESIGN_SNAPSHOT} onSignOut={null} />
    </>
  );
}
