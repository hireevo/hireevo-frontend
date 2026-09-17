import type { Metadata } from 'next';
import { Prose, TemplateNotice } from '../_prose.tsx';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern use of HireEvo.',
};

export default function TermsPage() {
  return (
    <>
      <p className="text-sm font-medium tracking-wide text-content-subtle uppercase">Legal</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-content-accent">
        Terms of Service
      </h1>
      <p className="mt-2 mb-8 text-sm text-content-subtle">Last updated: 17 September 2026</p>

      <TemplateNotice />

      <Prose>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of HireEvo (the
          &ldquo;Service&rdquo;). By creating an account or using the Service, you agree to these
          Terms. If you do not agree, do not use the Service.
        </p>

        <h2>1. Accounts</h2>
        <p>
          You must provide accurate information when you register and keep it current. You are
          responsible for the activity under your account and for keeping your password
          confidential. Confirm your email address to activate your account; an unconfirmed sign-up
          is not an account.
        </p>

        <h2>2. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>impersonate any person or misrepresent your identity or affiliation;</li>
          <li>post unlawful, misleading, or infringing content;</li>
          <li>attempt to access accounts, data, or systems that are not yours;</li>
          <li>
            interfere with or disrupt the Service, or circumvent its rate limits and protections.
          </li>
        </ul>

        <h2>3. Your content</h2>
        <p>
          You retain ownership of the profile information and materials you submit. You grant
          HireEvo the licence needed to host, display, and distribute that content for the purpose
          of operating the Service. You are responsible for the content you publish and for the
          rights to share it.
        </p>

        <h2>4. Privacy</h2>
        <p>
          Our handling of personal data is described in the <a href="/privacy">Privacy Policy</a>,
          which forms part of these Terms.
        </p>

        <h2>5. Termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or terminate access if you
          breach these Terms or to protect the Service and its users. Some provisions survive
          termination, including ownership, disclaimers, and limitations of liability.
        </p>

        <h2>6. Disclaimers and liability</h2>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the extent
          permitted by law, HireEvo is not liable for indirect or consequential losses arising from
          your use of the Service.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update these Terms. Material changes will be notified through the Service or by
          email; continued use after a change means you accept the updated Terms.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:legal@hireevo.com">legal@hireevo.com</a>.
        </p>
      </Prose>
    </>
  );
}
