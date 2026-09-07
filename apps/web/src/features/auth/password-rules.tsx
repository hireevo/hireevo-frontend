'use client';

import { AiFillCheckCircle } from 'react-icons/ai';
import { PASSWORD_RULES } from './schemas.ts';

/**
 * The live checklist under the sign-up password field.
 *
 * It is a list rather than four paragraphs, and each item states whether it is
 * met in text as well as in colour — the design distinguishes them by fill
 * alone, which is the one cue a colour-blind user does not get.
 */
export function PasswordRules({ value }: { value: string }) {
  return (
    <ul className="mt-4 flex flex-col gap-px">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(value);
        return (
          <li key={rule.id} className="flex items-center gap-2.5 text-base leading-5">
            {/* One fill at two opacities, as the design draws it. The label
                stays the same colour either way, so the state is never carried
                by colour alone — the text below is what says which it is. */}
            <AiFillCheckCircle
              aria-hidden="true"
              className={
                met ? 'size-4 shrink-0 text-accent-soft' : 'size-4 shrink-0 text-accent-soft/20'
              }
            />
            <span className="text-content">
              {rule.label}
              <span className="sr-only">{met ? ' — met' : ' — not met yet'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
