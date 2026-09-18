import type { Metadata } from 'next';
import { LegalDocument } from '../_components/legal-document.tsx';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of HireEvo.',
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      effective="on publication"
      notice="This is a preliminary version, published so the links in the product resolve to a real page. It describes how we intend these terms to work; the final, binding version will replace it here and will be dated when it takes effect."
      sections={[
        {
          heading: 'Using HireEvo',
          body: [
            'HireEvo helps you build a professional profile, publish a portfolio, and be found by potential clients and employers without exposing your private contact details.',
            'You are responsible for the accuracy of what you publish and for keeping your account credentials secure. You must be old enough to form a binding contract in your country to use the service.',
          ],
        },
        {
          heading: 'Your content',
          body: [
            'You keep ownership of the content you add to your profile and portfolio. You grant HireEvo the permission needed to store it and to display the parts you choose to make public.',
            'You agree not to publish content that is unlawful, that infringes someone else’s rights, or that misrepresents your identity or experience.',
          ],
        },
        {
          heading: 'Availability and changes',
          body: [
            'We work to keep the service available but do not guarantee uninterrupted access, and features may change as the product develops.',
            'We may update these terms. When we do, we will post the revised version here with a new effective date, and material changes will be communicated to account holders.',
          ],
        },
        {
          heading: 'Contact',
          body: [
            'Questions about these terms can be sent to legal@hireevo.com. Our Privacy Policy explains how we handle your personal data.',
          ],
        },
      ]}
    />
  );
}
