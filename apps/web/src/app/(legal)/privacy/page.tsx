import type { Metadata } from 'next';
import { Prose, TemplateNotice } from '../_prose.tsx';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How HireEvo collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <>
      <p className="text-sm font-medium tracking-wide text-content-subtle uppercase">Legal</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-content-accent">Privacy Policy</h1>
      <p className="mt-2 mb-8 text-sm text-content-subtle">Last updated: 17 September 2026</p>

      <TemplateNotice />

      <Prose>
        <p>
          This Privacy Policy explains what personal data HireEvo (the &ldquo;Service&rdquo;)
          collects, how we use it, and the choices you have. It applies to everyone who uses the
          Service.
        </p>

        <h2>1. Data we collect</h2>
        <ul>
          <li>
            <strong>Account data</strong> — your name, username, email address, and password (stored
            only as a secure hash).
          </li>
          <li>
            <strong>Profile data</strong> — the professional details you choose to add. Contact
            details such as phone number and address are kept private and are never shown on a
            public profile unless you make them public.
          </li>
          <li>
            <strong>Technical data</strong> — limited log information needed to operate the Service
            securely. IP addresses are stored only as a keyed hash for abuse prevention, never in
            the clear.
          </li>
        </ul>

        <h2>2. How we use it</h2>
        <ul>
          <li>to create and secure your account and verify your email address;</li>
          <li>to provide, maintain, and improve the Service;</li>
          <li>to protect against fraud, abuse, and unauthorised access;</li>
          <li>to send transactional email such as confirmation and password-reset codes.</li>
        </ul>

        <h2>3. Bot protection</h2>
        <p>
          Sign-up may be protected by Google reCAPTCHA to prevent automated abuse. reCAPTCHA
          collects device and usage information subject to Google&rsquo;s{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
            Terms of Service
          </a>
          .
        </p>

        <h2>4. Sharing</h2>
        <p>
          We do not sell your personal data. We share it only with service providers who help us run
          the Service (such as email delivery and bot protection) under contracts that require them
          to protect it, or where required by law.
        </p>

        <h2>5. Retention</h2>
        <p>
          We keep personal data for as long as your account is active and as needed to provide the
          Service. Unconfirmed sign-ups and spent verification codes are removed automatically after
          they expire.
        </p>

        <h2>6. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, or delete
          your personal data, and to object to certain processing. To exercise these rights, contact
          us at <a href="mailto:privacy@hireevo.com">privacy@hireevo.com</a>.
        </p>

        <h2>7. Changes</h2>
        <p>
          We may update this Policy. Material changes will be notified through the Service or by
          email.
        </p>

        <h2>8. Contact</h2>
        <p>
          Questions about privacy can be sent to{' '}
          <a href="mailto:privacy@hireevo.com">privacy@hireevo.com</a>.
        </p>
      </Prose>
    </>
  );
}
