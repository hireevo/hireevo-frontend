import { env } from '@/env';

/**
 * Where the mail actually went, while developing.
 *
 * Locally the API delivers to a mail catcher on the machine instead of to the
 * address that was typed — which is right, or every test sign-up would mail a
 * real person. But it leaves "check your email" pointing at an inbox that will
 * never receive anything, and the screen gives no hint of that. This is the
 * hint.
 *
 * It renders only when a mailbox URL is configured, which production never
 * sets, and it says plainly that it is a development affordance so nobody
 * mistakes it for something a user should see.
 *
 * `carries` has no default on purpose. Confirmation mail holds a six-digit
 * code and recovery mail holds a link, and a note that tells someone to go and
 * read a code that was never sent is worse than no note at all — it sends them
 * looking for the wrong thing and then to their real inbox when they cannot
 * find it. Making every caller say which one it is means a new screen cannot
 * inherit the wrong sentence by saying nothing.
 */
export function DevMailboxNote({ carries }: { carries: 'code' | 'link' }) {
  const mailbox = env.NEXT_PUBLIC_DEV_MAILBOX_URL;
  if (mailbox === undefined || env.NODE_ENV === 'production') return null;

  return (
    <p className="mt-6 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-content-muted">
      <span className="font-medium">Development only.</span> Mail is delivered to the local mailbox,
      not to the address above.{' '}
      <a
        href={mailbox}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-content-link underline underline-offset-2"
      >
        {carries === 'code' ? 'Open it to read the code' : 'Open it to follow the link'}
      </a>
      .
    </p>
  );
}
