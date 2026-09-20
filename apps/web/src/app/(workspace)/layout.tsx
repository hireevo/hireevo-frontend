import { SignedInOnly } from '@/features/auth/signed-in-only.tsx';
import { SessionChrome } from '@/features/workspace/workspace-chrome.tsx';

/**
 * Every page in this group is for a signed-in user; being here is the
 * protection, and the header above it comes with the group rather than with
 * each page remembering to ask (§6.6).
 */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInOnly>
      <SessionChrome />
      {children}
    </SignedInOnly>
  );
}
