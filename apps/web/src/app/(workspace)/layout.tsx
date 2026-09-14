import { SignedInOnly } from '@/features/auth/signed-in-only.tsx';

/** Every page in this group is for a signed-in user; being here is the protection. */
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <SignedInOnly>{children}</SignedInOnly>;
}
