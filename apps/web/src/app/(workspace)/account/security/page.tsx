import type { Metadata } from 'next';
import { cn } from '@hireevo/ui-web';
import { SecurityScreen } from '@/features/account/security-screen.tsx';
import { AccountHeader } from '@/features/account/account-header.tsx';
import { CONTAINER } from '@/features/workspace/layout.ts';

export const metadata: Metadata = {
  title: 'Account security',
  robots: { index: false, follow: false },
};

export default function AccountSecurityPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main-content" className={cn(CONTAINER, 'pt-10 pb-24')}>
        <AccountHeader
          title="Account security"
          description="Update your password and manage additional security settings."
        />
        <div className="mt-8">
          <SecurityScreen />
        </div>
      </main>
    </div>
  );
}
