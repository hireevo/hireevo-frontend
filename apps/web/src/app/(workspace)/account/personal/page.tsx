import type { Metadata } from 'next';
import { cn } from '@hireevo/ui-web';
import { AccountHeader } from '@/features/account/account-header.tsx';
import { PersonalScreen } from '@/features/account/personal-screen.tsx';
import { CONTAINER } from '@/features/workspace/layout.ts';

export const metadata: Metadata = {
  title: 'Personal information',
  robots: { index: false, follow: false },
};

export default function AccountPersonalPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main id="main-content" className={cn(CONTAINER, 'pt-10 pb-24')}>
        <AccountHeader
          title="Personal information"
          description="Your details, and who can see your profile online."
        />
        <div className="mt-8">
          <PersonalScreen />
        </div>
      </main>
    </div>
  );
}
