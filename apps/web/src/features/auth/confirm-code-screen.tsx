import Link from 'next/link';
import { ConfirmEmailForm, type CodePurpose } from './confirm-email-form.tsx';
import { DevMailboxNote } from './dev-mailbox-note.tsx';

/**
 * "Confirm your email", in both the sign-up and the recovery columns.
 *
 * The two frames are not identical. Both move the whole screen 15px left of the
 * other forms (x=70 instead of 85) — shifted, not widened, so the column stays
 * 530px. Sign-up (132:1812) runs the heading and copy
 * across the full 530px and centres the code boxes; recovery (132:1758) sets
 * everything in a 441px block, centred, with its contents left-aligned. Each
 * route renders its own frame.
 */
export function ConfirmCodeScreen({ address, purpose }: { address: string; purpose: CodePurpose }) {
  const block = purpose === 'recovery' ? 'mx-auto w-full max-w-[441px]' : 'w-full';
  const copy = purpose === 'recovery' ? 'max-w-[369px]' : '';
  const backHref = purpose === 'recovery' ? '/recover' : '/sign-up';

  return (
    <div className="flex flex-col lg:relative lg:left-[-15px]">
      <div className={block}>
        <div className={copy}>
          <h1 className="text-[2rem] leading-none font-bold tracking-tight text-content-accent">
            Confirm your email
          </h1>
          {/* Four lines in an 81px box in the file, the third left blank. The
              address may break anywhere: an email is one unbroken word, and a
              long one otherwise pushes a phone screen sideways. */}
          <p className="mt-[19px] text-base leading-[20.25px] text-content [overflow-wrap:anywhere]">
            Enter the 6-digit verification code we sent
            <br />
            to {address === '' ? 'your email address' : address}.
            <br />
            <br />
            Please enter it below
          </p>
          {/* A way out of the flow: entering the wrong address should not be a
              dead end. Returns to the screen the address was typed on. */}
          <Link
            href={backHref}
            className="mt-3 inline-flex items-center gap-1.5 text-base font-medium text-content-link underline underline-offset-2"
          >
            <span aria-hidden="true">&larr;</span> Use a different email
          </Link>
        </div>
        <DevMailboxNote />
      </div>
      <ConfirmEmailForm email={address} purpose={purpose} />
    </div>
  );
}
