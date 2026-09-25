import type { Metadata } from 'next';
import { cn } from '@hireevo/ui-web';
import { AccountHeader } from '@/features/account/account-header.tsx';
import { IdentityScreen } from '@/features/account/identity-screen.tsx';
import { CONTAINER } from '@/features/workspace/layout.ts';

export const metadata: Metadata = {
  title: 'Identity verification',
  robots: { index: false, follow: false },
};

export default function IdentityVerificationPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main-content" className={cn(CONTAINER, 'pt-10 pb-24')}>
        <AccountHeader
          title="Identity verification"
          description="Confirm who you are to unlock a verified seller badge."
        />
        <div className="mt-8">
          <IdentityScreen />
        </div>
      </main>
    </div>
  );
}
