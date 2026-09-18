import type { Metadata } from 'next';
import { LegalDocument } from '../_components/legal-document.tsx';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How HireEvo collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      effective="on publication"
      notice="This is a preliminary version, published so the links in the product resolve to a real page. It describes how we intend to handle your data; the final, binding version will replace it here and will be dated when it takes effect."
      sections={[
        {
          heading: 'What we collect',
          body: [
            'We collect the account details you give us — your name, email address, and the profile and portfolio content you add.',
            'Your private contact details are stored separately from your public profile and are never included in the public version of your profile or in search results.',
          ],
        },
        {
          heading: 'How we use it',
          body: [
            'We use your data to run your account, to show the parts of your profile you choose to make public, and to send you the messages the service depends on, such as confirmation and password-reset codes.',
            'We do not sell your personal data.',
          ],
        },
        {
          heading: 'Keeping it safe',
          body: [
            'Passwords are stored only as salted hashes, connections are encrypted in transit, and access to personal data is limited to what running the service requires.',
            'We keep your data for as long as your account is active and remove it, or anonymise it, when it is no longer needed.',
          ],
        },
        {
          heading: 'Your choices and contact',
          body: [
            'You can view and edit your profile at any time, control what is public through your visibility settings, and ask us to export or delete your account data.',
            'Privacy questions and requests can be sent to privacy@hireevo.com.',
          ],
        },
      ]}
    />
  );
}
